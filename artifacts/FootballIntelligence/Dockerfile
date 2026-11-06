FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations

RUN pip install --no-cache-dir .

# Render injects $PORT (default 10000). Local default 8000.
ENV PORT=8000
EXPOSE 8000

# Run migrations then start the API
CMD ["sh", "-c", "alembic upgrade head && uvicorn football_ai.main:app --host 0.0.0.0 --port ${PORT}"]
