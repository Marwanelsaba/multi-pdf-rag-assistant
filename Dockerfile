FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM python:3.12-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RAG_DATA_DIR=/app/data \
    HF_HOME=/app/model-cache \
    HF_HUB_DISABLE_TELEMETRY=1
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && mkdir -p /app/data /app/model-cache \
    && chown app:app /app/data /app/model-cache
COPY backend ./backend
COPY scripts ./scripts
COPY --from=frontend /app/dist ./dist
USER app
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
