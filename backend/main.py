
from typing import Union
from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
import csv
import os
import subprocess
import threading
import time
from datetime import datetime, timedelta

def log_features_to_csv(features: dict, filename="good_log.csv"):
    # Add fixed "class" column
    row = {**features, "class": "good"}

    # If file doesn't exist, create with headers
    file_exists = os.path.isfile(filename)
    with open(filename, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

# the fast api setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],             
    allow_methods=["*"],
    allow_headers=["*"],             
    allow_credentials=True,
)

#the base model for features
class Features(BaseModel):
    method: str
    path: str
    body: str
    single_q: int
    double_q: int
    dashes: int
    braces: int
    spaces: int
    percentages: int
    semicolons: int
    angle_brackets: int
    special_chars: int
    path_length: int
    body_length: int
    badwords_count: int


# Load all the preprossind model to process the features
ord_enc = joblib.load("./models/ordinal_encoder.pkl")
scaler = joblib.load("./models/scaler.pkl")
feature_columns = joblib.load("./models/feature_columns.pkl")
label_map = joblib.load("./models/label_map.pkl")

# load all the  trained models
models = {
    "svm": joblib.load("./models/svm_model.pkl"),
    "random_forest": joblib.load("./models/random_forest_model.pkl"),
    "knn": joblib.load("./models/knn_model.pkl"),
    "stacked": joblib.load("./models/stacked_model.pkl"),
}

reverse_label_map = {v: k for k, v in label_map.items()}

#Process the features 
def preprocess_features(features: Features):
    df = pd.DataFrame([features.model_dump()])

    # Drop unused columns
    df = df.drop(columns=["body", "path"], errors="ignore")

    # Encode categorical (method)
    if features.method not in ord_enc.categories_[0]:
        df["method"] = "missing"
    X_cat = ord_enc.transform(df[["method"]])
    X_cat_df = pd.DataFrame(X_cat, columns=["method_enc"])

    # Drop raw method
    df = df.drop(columns=["method"])

    # Merge encoded categorical + numeric
    X = pd.concat([X_cat_df.reset_index(drop=True), df.reset_index(drop=True)], axis=1)

    # Reindex to match training
    X = X.reindex(columns=feature_columns, fill_value=0)

    # Scale
    X_scaled = scaler.transform(X)
    return X_scaled

# the backend server routes 
@app.get("/") # testing the api this is the route 
def read_root():
    return {"Hello": "World"}

@app.post("/predict")
def predict(features: Features):
    #log_features_to_csv(features.model_dump())
    X_scaled = preprocess_features(features)

    results = {}
    for name, model in models.items():
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X_scaled)[0]
            pred_class = int(model.predict(X_scaled)[0])
            results[name] = {
                "prediction": reverse_label_map[pred_class],
                "probabilities": {reverse_label_map[0]: float(proba[0]), reverse_label_map[1]: float(proba[1])}
            }
        else:
            pred_class = int(model.predict(X_scaled)[0])
            results[name] = {"prediction": reverse_label_map[pred_class]}

        # TODO: add the classified data into the existing dataset for retraining
    return {
        "input": features.model_dump(),
        "results": results
    }


# ========== Load phishing models and preprocessing tools ==========
PHISHING_MODEL_DIR = "./p_models"

# Verify phishing model directory exists
if not os.path.exists(PHISHING_MODEL_DIR):
    os.makedirs(PHISHING_MODEL_DIR)
    print(f"[Phishing] Created directory for phishing models: {PHISHING_MODEL_DIR}")

phishing_model_files = {
    "p_svm": os.path.join(PHISHING_MODEL_DIR, "svm_model.pkl"),
    "p_random_forest": os.path.join(PHISHING_MODEL_DIR, "random_forest_model.pkl"),
    "p_knn": os.path.join(PHISHING_MODEL_DIR, "knn_model.pkl"),
    "p_stacked": os.path.join(PHISHING_MODEL_DIR, "stacked_model.pkl"),
    "p_boost":os.path.join( PHISHING_MODEL_DIR, "xgboost_model.pkl"),
    "scaler": os.path.join(PHISHING_MODEL_DIR, "scaler.pkl"),
    "feature_columns": os.path.join(PHISHING_MODEL_DIR, "feature_columns.pkl")
}

# Load phishing preprocessing artifacts
try:
    p_scaler = joblib.load(phishing_model_files["scaler"])
    p_feature_columns = joblib.load(phishing_model_files["feature_columns"])
    print(f"[Phishing] ✅ Loaded feature columns: {p_feature_columns}")
    print(f"[Phishing] ✅ Expected feature count: {len(p_feature_columns)}")
except Exception as e:
    raise RuntimeError(f"[Phishing] ⚠️ Error loading preprocessing artifacts: {e}")

# Load phishing models into separate dictionary
phishing_models = {}
for name in ["p_svm", "p_random_forest", "p_knn", "p_stacked","p_boost"]:
    path = phishing_model_files[name]
    try:
        if os.path.exists(path):
            phishing_models[name] = joblib.load(path)
            print(f"[Phishing] ✅ Loaded {name} model from {path}")
        else:
            print(f"[Phishing] ⚠️ Model file not found: {path}")
    except Exception as e:
        print(f"[Phishing] ⚠️ Failed to load {name} from {path}: {e}")

print(f"[Phishing] ✅ Successfully loaded {len(phishing_models)} phishing models")

# Phishing features model - DYNAMICALLY GENERATED FROM TRAINING COLUMNS
class PhishingFeatures(BaseModel):
    # This will be dynamically validated against p_feature_columns
    features: dict

@app.post("/predictPhishing")
def predict_phishing(features: dict):
    """
    Predict phishing probability using multiple models.
    Accepts a flat dictionary of features matching the training schema.
    
    Example request body:
    {
        "url_length": 45.0,
        "n_dots": 2.0,
        "n_hypens": 1.0,
        ...
    }
    """
    try:
        # Validate feature presence
        missing_features = [col for col in p_feature_columns if col not in features]
        if missing_features:
            error_msg = (
                f"Missing {len(missing_features)} required features. "
                f"Expected features: {p_feature_columns}"
            )
            print(f"[Phishing] ❌ Validation failed: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing features: {missing_features[:5]}{'...' if len(missing_features) > 5 else ''}"
            )
        
        # Create DataFrame with features in EXACT training order
        feature_dict = {col: [features[col]] for col in p_feature_columns}
        X = pd.DataFrame(feature_dict)
        
        # Scale features
        X_scaled = p_scaler.transform(X)
        
        # Verify dimensions match training
        if X_scaled.shape[1] != len(p_feature_columns):
            raise ValueError(
                f"Feature count mismatch after scaling: "
                f"got {X_scaled.shape[1]}, expected {len(p_feature_columns)}"
            )

        # Generate predictions for all models
        results = {}
        for name, model in phishing_models.items():
            try:
                # Get prediction
                pred_class = int(model.predict(X_scaled)[0])
                prediction = "phishing" if pred_class == 1 else "legitimate"
                
                # Get probabilities if available
                if hasattr(model, "predict_proba"):
                    proba = model.predict_proba(X_scaled)[0]
                    results[name] = {
                        "prediction": prediction,
                        "confidence": float(max(proba)),
                        "probabilities": {
                            "legitimate": float(proba[0]),
                            "phishing": float(proba[1])
                        }
                    }
                else:
                    results[name] = {
                        "prediction": prediction,
                        "confidence": None
                    }
                
                print(f"[Phishing] {name}: {prediction} (confidence: {results[name].get('confidence', 'N/A')})")
                
            except Exception as e:
                error_detail = f"Model {name} failed: {str(e)}"
                print(f"[Phishing] ⚠️ {error_detail}")
                results[name] = {
                    "error": error_detail,
                    "prediction": "error"
                }

        # Create ensemble prediction (average probabilities)
        valid_probs = [
            results[name]["probabilities"] 
            for name in results 
            if "probabilities" in results[name]
        ]
        
        if valid_probs:
            avg_legit = np.mean([p["legitimate"] for p in valid_probs])
            avg_phishing = np.mean([p["phishing"] for p in valid_probs])
            ensemble_pred = "phishing" if avg_phishing >= 0.5 else "legitimate"
            
            results["ensemble"] = {
                "prediction": ensemble_pred,
                "confidence": float(max(avg_legit, avg_phishing)),
                "probabilities": {
                    "legitimate": float(avg_legit),
                    "phishing": float(avg_phishing)
                },
                "note": "Average of all probability-based models"
            }

        return {
            "success": True,
            "input_features": features,
            "predictions": results,
            "timestamp": datetime.now().isoformat(),
            "expected_features": p_feature_columns,
            "feature_count": len(p_feature_columns)
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Prediction failed: {str(e)}"
        print(f"[Phishing] 🔴 CRITICAL ERROR: {error_msg}")
        print(f"Received features: {list(features.keys())}")
        print(f"Expected features: {p_feature_columns}")
        raise HTTPException(status_code=500, detail=error_msg)#do the retrainig cade here
# ========== Scheduled retraining logic ==========

# ========== Configuration ==========
RETRAIN_INTERVAL_DAYS = 30
TRAFFIC_RETRAIN_SCRIPT = "./retrain.py"
PHISHING_RETRAIN_SCRIPT = "./p_retrain.py"

LAST_TRAFFIC_FILE = "last_retrain.txt"
LAST_PHISHING_FILE = "last_retrain_phishing.txt"

START_TIME = datetime.now()


# ========== Helper Function ==========
def run_retrain_script(script_path, last_run_file, model_name):
    """Run a retraining script and update its last-run timestamp."""
    try:
        print(f"[Retrain] Running {model_name} retraining script: {script_path}")
        subprocess.run(["python", script_path], check=True)
        with open(last_run_file, "w") as f:
            f.write(datetime.now().isoformat())
        print(f"[Retrain] {model_name} retraining completed successfully.")
    except Exception as e:
        print(f"[Retrain] Error during {model_name} retraining: {e}")

# ========== Scheduler Logic ==========
def retrain_scheduler():
    """Background thread to check and trigger retraining for all models every 30 days."""
    while True:
        try:
            # --- Traffic retraining check ---
            try:
                with open(LAST_TRAFFIC_FILE, "r") as f:
                    last_traffic_run = datetime.fromisoformat(f.read().strip())
            except Exception:
                last_traffic_run = START_TIME

            # --- Phishing retraining check ---
            try:
                with open(LAST_PHISHING_FILE, "r") as f:
                    last_phishing_run = datetime.fromisoformat(f.read().strip())
            except Exception:
                last_phishing_run = START_TIME

            # --- Trigger retraining if interval exceeded ---
            now = datetime.now()
            if now - last_traffic_run >= timedelta(days=RETRAIN_INTERVAL_DAYS):
                run_retrain_script(TRAFFIC_RETRAIN_SCRIPT, LAST_TRAFFIC_FILE, "Traffic")

            if now - last_phishing_run >= timedelta(days=RETRAIN_INTERVAL_DAYS):
                run_retrain_script(PHISHING_RETRAIN_SCRIPT, LAST_PHISHING_FILE, "Phishing")

        except Exception as e:
            print(f"[Retrain] Scheduler error: {e}")

        time.sleep(24 * 3600)  # Check once per day

# ========== Manual Retrain Endpoints ==========
@app.get("/retrain/traffic")
def manual_retrain_traffic():
    run_retrain_script(TRAFFIC_RETRAIN_SCRIPT, LAST_TRAFFIC_FILE, "Traffic")
    return {"status": "Traffic retraining started manually"}

@app.get("/retrain/phishing")
def manual_retrain_phishing():
    run_retrain_script(PHISHING_RETRAIN_SCRIPT, LAST_PHISHING_FILE, "Phishing")
    return {"status": "Phishing retraining started manually"}

# ========== Start Background Scheduler ==========
@app.on_event("startup")
def start_scheduler():
    threading.Thread(target=retrain_scheduler, daemon=True).start()
    print("[Retrain] Background retraining scheduler started.")
