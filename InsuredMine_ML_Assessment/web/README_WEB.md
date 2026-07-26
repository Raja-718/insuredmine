# InsuredMine — Production Web App (bonus)

A branded, production-grade web application on top of the assessment code.
**FastAPI** backend + a custom **HTML/CSS/JS** frontend (no heavy framework, no
Streamlit). This is extra to the required A/B/C submission.

```
web/
├── backend/main.py        FastAPI: JSON APIs + serves the frontend
├── frontend/
│   ├── index.html         branded single-page UI
│   └── assets/            styles.css, app.js
├── requirements_web.txt
└── Dockerfile
```

## What it does
- **Premium Prediction** — pick a year/month, get a live premium forecast; view
  the model-comparison table (R²/MAE), an interactive premium-share chart, and
  the actual-vs-predicted diagnostic plot.
- **Document AI** — paste OCR text, extract structured customer records as cards.
- **Insights** — how the platform is built.

## Run locally
From the **project root**:

```bash
pip install -r requirements.txt            # core ML libs (if not already)
pip install -r web/requirements_web.txt    # FastAPI + uvicorn
uvicorn web.backend.main:app --port 8000
# open http://localhost:8000
```

Interactive API docs are auto-generated at `http://localhost:8000/docs`.

## API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/health`   | health check |
| GET  | `/api/metrics`  | Section A model metrics + history |
| GET  | `/api/predict?year=&month=` | premium prediction |
| POST | `/api/extract`  | OCR text → structured records |
| GET  | `/api/plot`     | actual-vs-predicted chart (PNG) |

## Run with Docker (from project root)
```bash
docker build -f web/Dockerfile -t insuredmine-web .
docker run -p 8000:8000 insuredmine-web
```

## Free cloud deploy (optional)
The Docker image runs on any container host — **Render.com**, **Railway**, or
**Fly.io** (all have free tiers). Push the repo, point the service at
`web/Dockerfile`, expose port 8000.
