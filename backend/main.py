
from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
import csv
import os

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

