# Production container for the InsuredMine web app.
# Build from the PROJECT ROOT:
#   docker build -f web/Dockerfile -t insuredmine-web .
#   docker run -p 8000:8000 insuredmine-web
# Then open http://localhost:8000
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt web/requirements_web.txt ./reqs/
RUN pip install --upgrade pip \
    && pip install -r reqs/requirements.txt \
    && pip install -r reqs/requirements_web.txt

COPY . .
RUN python -m src.premium_prediction        # pre-generate metrics + plot

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

CMD ["uvicorn", "web.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
