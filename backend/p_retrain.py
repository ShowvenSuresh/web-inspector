import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE
import joblib
import os

# Step 2: Load the dataset
file_path = './Data/web-page-phishing (1).csv'  # ✅ Update to your dataset path
f_cleaned = pd.read_csv(file_path)

print("✅ Dataset loaded successfully!")
print(f"Shape: {f_cleaned.shape}")

# Step 3: Separate features and target
X = f_cleaned.drop('phishing', axis=1)
y = f_cleaned['phishing']

# Step 4: Scale the features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Step 5: Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training set: {X_train.shape}, Testing set: {X_test.shape}")

# Step 6: Balance with SMOTE
smote = SMOTE(random_state=42)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
print("\nClass distribution after SMOTE:")
print(y_train_res.value_counts())

# Step 7: Define Models and Hyperparameter Grids
param_grids = {
    'Random Forest': {
        'n_estimators': [100, 200],
        'max_depth': [None, 10],
        'min_samples_split': [2, 5],
        'min_samples_leaf': [1, 2]
    },
    'KNN': {
        'n_neighbors': [3, 5],
        'weights': ['uniform', 'distance'],
        'metric': ['euclidean']
    },
    'SVM': {
        'C': [1, 10],
        'kernel': ['linear', 'rbf'],
        'gamma': ['scale']
    }
}

models = {
    'Random Forest': RandomForestClassifier(random_state=42),
    'KNN': KNeighborsClassifier(),
    'SVM': SVC(probability=True, random_state=42)
}

# Step 8: Fine-tune with GridSearchCV
best_models = {}

for name in models:
    print(f"\n Fine-tuning {name}...")
    grid = GridSearchCV(models[name], param_grids[name],
                        cv=3, scoring='f1', n_jobs=-1)
    grid.fit(X_train_res, y_train_res)
    best_models[name] = grid.best_estimator_
    print(f"Best Parameters for {name}: {grid.best_params_}")

# Step 9: Evaluate Fine-tuned Models
print("\n===================== MODEL PERFORMANCE =====================")
for name, model in best_models.items():
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"\n{name}:")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-Score  : {f1:.4f}")
    print(f"  ROC-AUC   : {auc:.4f}")

# Step 10: Stack the Best Models
stack_model = StackingClassifier(
    estimators=[
        ('rf', best_models['Random Forest']),
        ('knn', best_models['KNN']),
        ('svm', best_models['SVM'])
    ],
    final_estimator=LogisticRegression(random_state=42),
    cv=3,
    n_jobs=-1,
    stack_method='predict_proba'
)

print("\n Training Stacking Model...")
stack_model.fit(X_train_res, y_train_res)

# Step 11: Evaluate Stacked Model
y_pred_stack = stack_model.predict(X_test)
y_prob_stack = stack_model.predict_proba(X_test)[:, 1]

acc = accuracy_score(y_test, y_pred_stack)
prec = precision_score(y_test, y_pred_stack)
rec = recall_score(y_test, y_pred_stack)
f1 = f1_score(y_test, y_pred_stack)
auc = roc_auc_score(y_test, y_prob_stack)

print("\n🏆 FINAL STACKED MODEL PERFORMANCE:")
print(f"  Accuracy  : {acc:.4f}")
print(f"  Precision : {prec:.4f}")
print(f"  Recall    : {rec:.4f}")
print(f"  F1-Score  : {f1:.4f}")
print(f"  ROC-AUC   : {auc:.4f}")

print("\n✅ All models evaluated successfully.")

#  Step 13: Save Models to Google Drive
save_dir = './p_models'
os.makedirs(save_dir, exist_ok=True)

# Save scaler
joblib.dump(scaler, os.path.join(save_dir, 'scaler.pkl'))

# Save fine-tuned models
for name, model in best_models.items():
    file_name = name.lower().replace(" ", "_") + "_model.pkl"
    joblib.dump(model, os.path.join(save_dir, file_name))
    print(f" Saved {name} model to {save_dir}/{file_name}")

# Save stacked model
joblib.dump(stack_model, os.path.join(save_dir, 'stacked_model.pkl'))
print(f" Saved stacked model to {save_dir}/stacked_model.pkl")

print("\n✅ All models and scaler saved successfully!")
