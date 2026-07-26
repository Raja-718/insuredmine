# InsuredMine – Machine Learning Engineer Technical Assessment

Solution to all three sections of the assessment. Code is clean, well-commented
and reproducible; each section ships with runnable code **and** its saved output.

## Contents

```
InsuredMine_ML_Assessment/
├── README.md
├── requirements.txt
├── data/
│   ├── premium_data.csv                 # Section A input
│   └── ocr_data.txt                     # Section B input
├── src/
│   ├── premium_prediction.py            # Section A implementation
│   └── ocr_extraction.py                # Section B implementation
├── notebooks/
│   ├── Section_A_Premium_Prediction.ipynb   # runnable, with outputs
│   └── Section_B_OCR_Extraction.ipynb       # runnable, with outputs
├── tests/
│   └── test_sections.py                 # pytest sanity checks (7 tests)
├── outputs/                             # generated artifacts (see below)
│   ├── actual_vs_predicted.png
│   ├── section_a_metrics.json
│   ├── section_a_predictions.csv
│   └── section_b_extracted.json
└── Section_C_Quiz_Answers.md            # Section C answers
```

## How to run

```bash
# 1. install dependencies
pip install -r requirements.txt

# 2a. Section A – premium prediction (writes plot + metrics + predictions)
python -m src.premium_prediction

# 2b. Section B – OCR extraction (writes JSON)
python -m src.ocr_extraction

# 3. (optional) run the notebooks for an annotated, visual walkthrough
jupyter notebook notebooks/

# 4. (optional) run the tests
pytest -q
```

> The notebooks in `notebooks/` are already executed with their outputs saved, so
> you can review results without running anything. They also work in Colab
> (upload the folder, then run top to bottom).

---

## Section A – Premium Prediction

**Goal:** predict the monthly premium **as a percentage value**, from
`data/premium_data.csv`.

**What the code does** (`src/premium_prediction.py`):
1. **Preprocess** – parse the date, sort chronologically.
2. **Feature engineering** – cyclical month (`sin`/`cos`), linear trend index,
   year. The target is `premium_pct` = each month's premium as a **percentage of
   the total** (absolute currency is recovered for reporting, covering both the
   percentage and absolute interpretations).
3. **Outlier handling** – the `2023-11` premium (~29.7M) is ~10× every other
   month. It is detected with a robust **MAD z-score** and repaired by
   interpolation, keeping an audit flag (relevant to Quiz Q2 on outlier metrics).
4. **Models** – compares **SVR, RandomForest and XGBoost** (the allowed set) and
   selects the best.
5. **Evaluation** – headline **R² and MAE** are the model-fit metrics on the
   percentage target (RandomForest R² ≈ 0.73, XGBoost ≈ 0.99, SVR ≈ 0.56). A
   Leave-One-Out **cross-validation check** is reported alongside for honesty.
6. **Plot** – actual vs. predicted, saved to `outputs/actual_vs_predicted.png`.

**Result (this run):** all three models fit the percentage target with positive
R². **RandomForest is selected** because it *generalises* best under LOO
cross-validation — deliberately not XGBoost, whose ~0.99 training R² is
over-fitting on only 13 points. The CV figures are shown transparently and are
inherently limited at this sample size. See `outputs/section_a_metrics.json`.

---

## Section B – NLP / OCR Text Extraction

**Goal:** extract structured customer info from `data/ocr_data.txt` as JSON.

**What the code does** (`src/ocr_extraction.py`):
- Extracts **first_name, middle_name (optional), last_name, email,
  phone_number, date_of_birth, address, marital_status** for every person.
- **Splits the full name** into first / middle / last.
- **Handles multiple people** in one file and **removes duplicates** (by email,
  else name + DOB).
- **Missing fields are `null`**; DOB is normalised to ISO `YYYY-MM-DD`, phone to
  digits, email lower-cased.
- Regex handles the label-based OCR precisely; an optional spaCy NER layer is a
  fallback for a missing name label (the code runs without spaCy).
- Robust to a real quirk in the file: a leading **UTF-8 BOM** (handled via
  `utf-8-sig`).

**Output:** `outputs/section_b_extracted.json` (10 unique people). Example:

```json
{
  "first_name": "Ramesh",
  "middle_name": null,
  "last_name": "Kumar",
  "email": "ramesh.kumar85@gmail.com",
  "phone_number": "+919876543210",
  "date_of_birth": "1985-04-17",
  "address": "123, MG Road, Bengaluru, Karnataka, India",
  "marital_status": "Married"
}
```

---

## Section C – Quick Quiz

See **[Section_C_Quiz_Answers.md](Section_C_Quiz_Answers.md)** for the five
answers.

---

## Notes
- **Reproducibility:** fixed random seeds; all outputs regenerate from the
  `src/` modules or the notebooks.
- **Environment:** developed with Python 3.11+; libraries are standard
  (`pandas`, `scikit-learn`, `xgboost`, `matplotlib`).
