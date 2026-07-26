"""Lightweight tests for Section A (premium) and Section B (extraction).

Run:  pytest -q   (from the project root)
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import ocr_extraction as ocr          # noqa: E402
from src import premium_prediction as pp        # noqa: E402


# ---- Section B ------------------------------------------------------------
def test_name_split_three_parts():
    assert ocr._split_name("Ravi Kumar Sharma") == ("Ravi", "Kumar", "Sharma")


def test_name_split_two_parts_no_middle():
    assert ocr._split_name("Priya Sharma") == ("Priya", None, "Sharma")


def test_missing_fields_are_null():
    person = ocr.extract_person("Name: Solo Person")
    assert person["first_name"] == "Solo"
    assert person["middle_name"] is None
    assert person["email"] is None
    assert person["marital_status"] is None


def test_dedup_removes_duplicate_people():
    text = (
        "Name: A B\nEmail: a.b@x.com\nDOB: 01-01-1990\n\n"
        "Name: A B\nEmail: a.b@x.com\nDOB: 01-01-1990\n\n"  # duplicate
        "Name: C D\nEmail: c.d@x.com\n"
    )
    people = ocr.extract_all(text)
    assert len(people) == 2


def test_dob_and_phone_normalised():
    person = ocr.extract_person("Name: X Y\nDOB: 05-09-1978\nPhone: +91-9812345678")
    assert person["date_of_birth"] == "1978-09-05"
    assert person["phone_number"] == "+919812345678"


def test_extract_all_from_real_file():
    people = ocr.extract_from_file()
    assert len(people) == 10
    assert all("first_name" in p and "last_name" in p for p in people)


# ---- Section A ------------------------------------------------------------
def test_premium_pipeline_outputs_metrics():
    df = pp.engineer_features(pp.repair_outliers(pp.load_and_preprocess()))
    assert "premium_pct" in df.columns
    assert df["is_outlier"].sum() == 1          # the Nov-2023 anomaly
    results = pp.train_and_evaluate(df)
    best = pp.select_best(results)
    # Every candidate reports both R2 and MAE, in-sample and cross-validated.
    for r in results.values():
        assert "R2" in r["in_sample"] and "MAE_pct" in r["cross_val"]
    assert best in results
