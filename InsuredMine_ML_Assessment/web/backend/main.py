"""
InsuredMine — ML Intelligence Platform (production-grade web app)
================================================================

FastAPI backend that:
  * serves the branded single-page frontend (web/frontend),
  * exposes clean JSON APIs backed by the exact Section A / Section B code:
        GET  /api/health
        GET  /api/metrics            -> Section A model metrics
        GET  /api/predict            -> premium prediction for a year/month
        POST /api/extract            -> OCR text -> structured records
        GET  /api/plot               -> actual-vs-predicted chart (PNG)

Run:
    uvicorn web.backend.main:app --reload --port 8000
    # then open http://localhost:8000
"""
from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Make the project's `src` importable.
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src import ocr_extraction as ocr           # noqa: E402
from src import premium_prediction as pp         # noqa: E402

FRONTEND_DIR = ROOT / "web" / "frontend"

app = FastAPI(title="InsuredMine ML Intelligence Platform", version="1.0.0")


# ---------------------------------------------------------------------------
# Model / data loaded once and cached
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _prepared():
    df = pp.engineer_features(pp.repair_outliers(pp.load_and_preprocess()))
    results = pp.train_and_evaluate(df)
    best = pp.select_best(results)
    model = pp.candidate_models()[best]
    model.fit(df[pp.FEATURES], df["premium_pct"])
    if not pp.PLOT_FILE.exists() or not pp.METRICS_FILE.exists():
        pp.run()
    return df, results, best, model


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ExtractRequest(BaseModel):
    text: str = Field(..., description="Raw OCR text with one or more people")


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "InsuredMine ML Platform"}


@app.get("/api/metrics")
def metrics():
    df, results, best, _ = _prepared()
    return {
        "selected_model": best,
        "n_samples": int(len(df)),
        "outliers_repaired": int(df["is_outlier"].sum()),
        "models": [
            {
                "name": name,
                "r2_fit": round(r["in_sample"]["R2"], 3),
                "mae_pct_fit": round(r["in_sample"]["MAE_pct"], 3),
                "r2_cv": round(r["cross_val"]["R2"], 3),
            }
            for name, r in results.items()
        ],
        "history": [
            {"date": d.strftime("%Y-%m"), "actual_pct": round(a, 3)}
            for d, a in zip(df["date"], df["premium_pct"])
        ],
    }


@app.get("/api/predict")
def predict(year: int, month: int):
    if not 1 <= month <= 12:
        raise HTTPException(400, "month must be 1..12")
    df, _, best, model = _prepared()
    last = df["date"].max()
    months_ahead = (year - last.year) * 12 + (month - last.month)
    time_index = (len(df) - 1) + max(months_ahead, 0)
    feat = pd.DataFrame([{
        "time_index": time_index,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
        "year": year,
    }])[pp.FEATURES]
    pred_pct = float(model.predict(feat)[0])
    total = float(df["premium"].sum())
    return {
        "year": year,
        "month": month,
        "model": best,
        "predicted_pct": round(pred_pct, 3),
        "predicted_premium": round(pred_pct / 100 * total, 2),
    }


@app.post("/api/extract")
def extract(req: ExtractRequest):
    people = ocr.extract_all(req.text)
    return {"count": len(people), "people": people}


@app.get("/api/sample-ocr")
def sample_ocr():
    return {"text": Path(ocr.DATA_FILE).read_text(encoding="utf-8-sig")}


@app.get("/api/plot")
def plot():
    _prepared()
    if not pp.PLOT_FILE.exists():
        raise HTTPException(404, "plot not generated")
    return FileResponse(str(pp.PLOT_FILE), media_type="image/png")


# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def index():
    return (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")


app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
