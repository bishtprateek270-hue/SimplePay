#!/bin/bash

# Ensure PORT is defined (default to Render's 10000)
PORT=${PORT:-10000}

echo "========================================================================"
echo "🚀 Starting Container Services (Production Bundle) on port $PORT"
echo "========================================================================"

# 1. Start Flask Backend API (Internal only, port 5000)
echo "⚡ Starting Backend API service on 127.0.0.1:5000..."
gunicorn --bind 127.0.0.1:5000 --chdir backend app:app --workers 1 --threads 2 &

# 2. Wait for backend to be ready
echo "⏳ Waiting for Backend API to become available..."
until curl -s http://127.0.0.1:5000/health > /dev/null; do
  sleep 1
done
echo "✅ Backend API is up and running!"

# 3. Start Flask GUI Web Dashboard (Publicly exposed, port $PORT)
export BACKEND_URL="http://127.0.0.1:5000"
echo "🖥️ Starting GUI Dashboard on 0.0.0.0:$PORT..."
exec gunicorn --bind 0.0.0.0:$PORT --chdir gui app:app --workers 1 --threads 2
