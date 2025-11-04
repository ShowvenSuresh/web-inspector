import joblib
model = joblib.load("p_models/svm_model.pkl")
print(model.n_features_in_)
cols = joblib.load("p_models/feature_columns.pkl")
print(cols)


