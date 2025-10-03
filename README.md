
# Web-Inspector

Web-Inspector is a browser extension + FastAPI backend that inspects outgoing HTTP(S) requests in real time, extracts lightweight text features, and classifies each request as safe or potentially malicious using trained machine learning models.

The goal is to help visualize live web traffic, surface risky requests, and experiment with request-level ML detection.

## Project structure

- backend/ – FastAPI service and ML artifacts
  - main.py – API server exposing /predict
  - retrain.py – end-to-end training pipeline (GridSearch + Stacking)
  - models/ – saved models and preprocessing artifacts (.pkl)
  - requirements.txt – backend dependencies
  - Data/ – datasets (e.g., combined_dataset.csv)
- extension/ – Chrome (Manifest v3) extension
  - background/background.js – intercepts requests, extracts features, calls backend
  - content/*.js – in-page warning/notification scripts
  - pages/popup.html, popup.js, styles.css – popup UI (Dashboard, Traffic, Alerts, History)
  - manifest.json – extension config
- docs/ – documentation placeholder

## How it works

1) The extension listens to webRequest events for all URLs.
2) For each request it extracts simple features from method, path and body (character counts, presence of certain keywords, lengths, etc.).
3) It POSTs those features to the FastAPI backend at http://127.0.0.1:8000/predict.
4) The backend preprocesses features (ordinal encoding + scaling, aligned to training columns) and runs multiple classifiers (SVM, Random Forest, KNN, and a stacked ensemble). It returns the predicted class and probabilities when available.
5) The extension updates live stats, traffic logs, and shows Alerts for requests classified as bad/malicious. Optional content scripts can render in-page warnings.

## Features

- Live traffic monitor in the popup UI
- Real-time classification via local ML models
- Recent Alerts list with per-request details and extracted features
- Toggle to enable/disable monitoring without uninstalling
- Basic history search (demo)

## Prerequisites

- Python 3.10+ (recommended)
- Chrome/Chromium-based browser that supports Manifest V3

## Getting started

### 1) Backend: FastAPI service

From the repository root:

- Create/activate a virtual environment (optional):
  - python -m venv backend/venv
  - source backend/venv/bin/activate  # Linux/Mac
- Install dependencies:
  - pip install -r backend/requirements.txt
- Run the API (make sure it binds to 127.0.0.1:8000):
  - cd backend
  - uvicorn main:app --reload --host 127.0.0.1 --port 8000

The service exposes:
- GET / – health check
- POST /predict – classification endpoint (see below)

### 2) Extension: load in Chrome

- Open chrome://extensions
- Enable Developer mode
- Click “Load unpacked” and select the extension/ folder
- Pin the extension if desired

When the backend is running, the popup Dashboard should begin showing live stats as you browse.

## API

POST /predict
- Content-Type: application/json
- Request body (schema mirrors backend.Features):

{
  "method": "POST",
  "path": "/api/login",
  "body": "username=admin' OR '1'='1&password=...",
  "single_q": 3,
  "double_q": 0,
  "dashes": 0,
  "braces": 0,
  "spaces": 5,
  "percentages": 0,
  "semicolons": 0,
  "angle_brackets": 0,
  "special_chars": 1,
  "path_length": 10,
  "body_length": 42,
  "badwords_count": 2
}

Example response:

{
  "input": { ... },
  "results": {
    "svm": { "prediction": "good" },
    "random_forest": { "prediction": "bad", "probabilities": { "good": 0.12, "bad": 0.88 } },
    "knn": { "prediction": "bad", "probabilities": { "good": 0.33, "bad": 0.67 } },
    "stacked": { "prediction": "bad", "probabilities": { "good": 0.05, "bad": 0.95 } }
  }
}

Notes
- The backend aligns incoming features to the training feature_columns.pkl and scales them with scaler.pkl.
- The final decision the extension uses in background.js is results.stacked.prediction when available.

## Model training and artifacts

- Training script: backend/retrain.py
  - Loads Data/combined_dataset.csv
  - Encodes categorical features (OrdinalEncoder), scales numerics, balances classes
  - Tunes base models with GridSearchCV and builds a StackingClassifier
  - Saves preprocessing artifacts and models as .pkl files
- Runtime artifacts expected by the API (in backend/models/):
  - ordinal_encoder.pkl
  - scaler.pkl
  - feature_columns.pkl
  - label_map.pkl
  - svm_model.pkl, random_forest_model.pkl, knn_model.pkl, stacked_model.pkl

If you retrain, make sure the new artifacts are written to backend/models/ (the API loads from ./models relative to backend/main.py).

## Popup UI tips

- Dashboard tab: toggle monitoring on/off and view counters (Requests, Blocked, Alerts, Avg Time)
- Traffic tab: live log of recent requests and their classification
- Alerts tab: detailed cards for requests flagged as malicious/bad (includes raw extracted features)
- History tab: simple browser history search

## Troubleshooting

- The popup remains at 0 requests
  - Ensure the backend is running at http://127.0.0.1:8000
  - Check that the extension is loaded and Developer mode is enabled
- CORS or network errors in the console
  - The backend enables CORS for all origins; verify the URL and that nothing else is listening on that port
- No models found / crash on startup
  - Ensure backend/models contains the required .pkl files listed above

## Security and privacy

- This is a local development tool. Do not transmit sensitive data to external services.
- The extension inspects request bodies when available to extract features; use responsibly and only on systems you own or have permission to analyze.

## Disclaimer

This project is intended for research and educational purposes. It is not a replacement for enterprise security tools.
