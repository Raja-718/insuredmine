# InsuredMine — AI Intelligence Platform (Live Demo)

A production-grade, **fully static** web app that showcases two machine-learning
capabilities from the InsuredMine ML assessment — running **entirely in the
browser**, so it deploys anywhere (GitHub Pages) with no server.

> 🔗 **Live demo:** `https://<your-username>.github.io/<repo-name>/`
> _(fill this in after you enable GitHub Pages — see below)_

## Features
- **📈 Premium Prediction** — pick a year/month and get a predicted premium share,
  a model-comparison table (R² & MAE), an interactive chart, and the
  actual-vs-predicted diagnostic plot.
- **🧾 Document AI** — paste OCR text and instantly extract structured customer
  records (name split into first/middle/last, email, phone, DOB, address, marital
  status), with de-duplication and `null` for missing fields.

## How it works
- The **OCR extraction** is a faithful JavaScript port of the Python pipeline
  (`ocr.js`) — verified to produce output identical to the backend.
- The **premium predictions** are pre-computed from the trained RandomForest model
  and embedded in `assets/data.js`, so the page needs no API.
- No frameworks, no build step, no backend — just HTML, CSS and vanilla JS.

## Run locally
Just open `index.html` in a browser, or serve it:

```bash
python -m http.server 8000     # then open http://localhost:8000
```

## 🚀 Deploy to GitHub Pages (free public URL)

1. **Create a new repository** on GitHub (e.g. `insuredmine-ml-demo`), empty.
2. From this folder, push the code:
   ```bash
   git init
   git add .
   git commit -m "InsuredMine ML — live demo"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment**
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` · folder `/ (root)` → **Save**
4. Wait ~1 minute. Your site is live at
   `https://<your-username>.github.io/<repo-name>/`
5. Put that URL back at the top of this README (and share it 🎉).

_All asset paths are relative, so the site works correctly under the
`/<repo-name>/` sub-path that GitHub Pages uses._

## Tech
HTML · CSS · vanilla JavaScript · SVG charts · scikit-learn / XGBoost (offline,
for the embedded predictions).
