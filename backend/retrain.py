import pandas as pd
import numpy as np 
import joblib
import warnings
from sklearn.model_selection import train_test_split, GridSearchCV,StratifiedKFold
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
try:
    from imblearn.over_sampling import RandomOverSampler
    has_imblearn = True
except Exception:
    has_imblearn = False

warnings.filterwarnings("ignore")

# --- CONFIG ---
LABEL_MAP = {"good": 0, "bad": 1}
RANDOM_STATE = 42
CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

# --- Load Data (replace with your sources) ---
#This is to do .....load the combined and full data set 
df = pd.read_csv('./Data/combined_dataset.csv')
# --- Label Mapping ---
df['class'] = df['class'].map(LABEL_MAP).astype(int)

# --- Features ---
df['body'] = df.get('body', "").fillna("")
df['body_length'] = df['body'].apply(len)
df = df.drop(columns=['body', 'path'], errors="ignore")

cat_cols = ['method']
num_cols = [
    'single_q', 'double_q', 'dashes', 'braces', 'spaces',
    'percentages', 'semicolons', 'angle_brackets', 'special_chars',
    'body_length', 'badwords_count'
]

for c in num_cols:
    df[c] = pd.to_numeric(df.get(c, 0)).fillna(0.0)

for c in cat_cols:
    df[c] = df.get(c, "missing").astype(str).fillna("missing")

X = df[cat_cols + num_cols]
y = df['class']

# --- Train/Test Split ---
X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
)

# --- Encode categorical ---
ord_enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
X_train_cat = ord_enc.fit_transform(X_train_raw[cat_cols])
X_test_cat = ord_enc.transform(X_test_raw[cat_cols])

cat_enc_names = [f"{c}_enc" for c in cat_cols]
X_train_enc = pd.DataFrame(X_train_cat, columns=cat_enc_names, index=X_train_raw.index)
X_test_enc = pd.DataFrame(X_test_cat, columns=cat_enc_names, index=X_test_raw.index)

X_train_comb = pd.concat([X_train_enc.reset_index(drop=True), X_train_raw[num_cols].reset_index(drop=True)], axis=1)
X_test_comb  = pd.concat([X_test_enc.reset_index(drop=True),  X_test_raw[num_cols].reset_index(drop=True)], axis=1)

# --- Oversample ---
if has_imblearn:
    ros = RandomOverSampler(random_state=RANDOM_STATE)
    X_train_bal, y_train_bal = ros.fit_resample(X_train_comb, y_train.reset_index(drop=True))
else:
    from sklearn.utils import resample
    train_df = pd.concat([X_train_comb, y_train.reset_index(drop=True)], axis=1)
    majority = train_df[train_df['class'] == 0]
    minority = train_df[train_df['class'] == 1]
    minority_up = resample(minority, replace=True, n_samples=len(majority), random_state=RANDOM_STATE)
    balanced = pd.concat([majority, minority_up]).sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)
    y_train_bal = balanced['class']
    X_train_bal = balanced.drop(columns=['class'])

# --- Scaling ---
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_bal)
X_test_scaled = scaler.transform(X_test_comb)

# --- Define Models + Param Grids ---
param_grids = {
    "svm": {"C": [0.1, 1, 10], "gamma": ["scale", 0.01], "kernel": ["rbf"]},
    "random_forest": {"n_estimators": [100, 200], "max_depth": [None, 20]},
    "knn": {"n_neighbors": [3, 5, 7], "weights": ["uniform", "distance"]}
}

base_models = {
    "svm": SVC(probability=True, random_state=RANDOM_STATE),
    "random_forest": RandomForestClassifier(random_state=RANDOM_STATE),
    "knn": KNeighborsClassifier()
}

best_models = {}

# --- Fine-tuning ---
for name, model in base_models.items():
    gs = GridSearchCV(model, param_grids[name], cv=CV, scoring="roc_auc", n_jobs=-1, verbose=1)
    gs.fit(X_train_scaled, y_train_bal)
    best_models[name] = gs.best_estimator_
    print(f"{name} best params: {gs.best_params_}")

# --- Stacking ---
estimators = [(k, v) for k, v in best_models.items()]
meta_model = LogisticRegression(random_state=RANDOM_STATE, max_iter=500)

stacking_clf = StackingClassifier(
    estimators=estimators,
    final_estimator=meta_model,
    stack_method="predict_proba",
    n_jobs=-1,
    cv=CV
)

stacking_clf.fit(X_train_scaled, y_train_bal)
y_pred = stacking_clf.predict(X_test_scaled)
y_proba = stacking_clf.predict_proba(X_test_scaled)[:, 1]

print("\n=== STACKING RESULTS ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("ROC AUC:", roc_auc_score(y_test, y_proba))
print(classification_report(y_test, y_pred))


# --- Save preprocessing artifacts ---
joblib.dump(ord_enc, "ordinal_encoder.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(num_cols + cat_enc_names, "feature_columns.pkl")
joblib.dump(LABEL_MAP, "label_map.pkl")

# --- Save base models (before fine-tuning) ---
for name, model in base_models.items():
    joblib.dump(model, f"{name}_base.pkl")
    print(f"Saved base model: {name}_base.pkl")

# --- Save fine-tuned models ---
for name, model in best_models.items():
    joblib.dump(model, f"{name}_best.pkl")
    print(f"Saved fine-tuned model: {name}_best.pkl")

# --- Save stacking model ---
joblib.dump(stacking_clf, "stacked_model.pkl")
print("Saved stacked model: stacked_model.pkl")

print("✅ All models and artifacts have been saved successfully.")

