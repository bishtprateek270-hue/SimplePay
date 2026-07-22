# Stage 1: Build React Frontend SPA
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve via Python Gunicorn
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Copy compiled SPA bundle from Stage 1 builder
COPY --from=frontend-builder /static/dist ./static/dist
EXPOSE 8501
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8501/health || exit 1
CMD ["gunicorn", "--bind", "0.0.0.0:8501", "--workers", "2", "app:app"]
