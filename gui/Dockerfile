# Use lightweight Python 3.11 base image
FROM python:3.11-slim

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy GUI application source code & templates
COPY . .

# Expose GUI port
EXPOSE 8501

# Docker health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8501/health || exit 1

# Launch Flask Web Application via Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8501", "--workers", "2", "app:app"]
