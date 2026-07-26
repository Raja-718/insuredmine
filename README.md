# InsuredMine — Machine Learning Engineer Assessment

This repository contains the technical assessment solution and a live, deployable
web demo built around it.

## Repository structure

```
.
├── InsuredMine_ML_Assessment/   # The assessment (Sections A, B, C)
│   ├── src/                     # premium_prediction.py, ocr_extraction.py
│   ├── notebooks/               # runnable notebooks with outputs
│   ├── outputs/                 # generated plot, metrics, extracted JSON
│   ├── tests/                   # pytest suite
│   └── README.md                # assessment write-up + how to run
│
└── insuredmine-web/             # Production static web demo (deployable)
    ├── index.html               # branded single-page app
    └── assets/                  # styles, client-side logic, data
```

## What's inside

**Assessment (`InsuredMine_ML_Assessment/`)**
- **Section A — Premium Prediction:** regression (SVR / RandomForest / XGBoost),
  cyclical feature engineering, robust outlier handling, evaluated with R² & MAE,
  plus an actual-vs-predicted plot.
- **Section B — NLP / OCR Extraction:** parses semi-structured text into clean
  JSON records (name split, email, phone, DOB, address, marital status), with
  de-duplication and null handling.
- **Section C — Quiz:** short conceptual answers.

**Web demo (`insuredmine-web/`)**
- A fully static, in-browser app: predict a month's premium, extract entities
  from OCR text, and view model metrics — no backend required.

## Quick start

```bash
# Assessment
cd InsuredMine_ML_Assessment
pip install -r requirements.txt
python -m src.premium_prediction
python -m src.ocr_extraction
pytest -q

# Web demo
cd insuredmine-web
python -m http.server 8000    # open http://localhost:8000
```

See [`InsuredMine_ML_Assessment/README.md`](InsuredMine_ML_Assessment/README.md)
for full details.
