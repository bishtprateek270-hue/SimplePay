#!/bin/bash
# ==============================================================================
# Phase 2 Cloud Deployment Script - Containerized Payment Application
# ==============================================================================
set -e

echo "🚀 Starting Phase 2 Cloud Deployment..."

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    echo "❌ Error: 'kubectl' CLI is not installed."
    exit 1
fi

echo "📦 1. Applying Kubernetes Secrets & Database PVC..."
kubectl apply -f k8s/mongodb-deployment.yaml

echo "⚡ 2. Deploying Payment Service REST API Backend..."
kubectl apply -f k8s/backend-deployment.yaml

echo "🖥️ 3. Deploying Payment GUI Web Dashboard..."
kubectl apply -f k8s/gui-deployment.yaml

echo "🌐 4. Applying Ingress Routing Rules..."
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for pods to reach 'Running' state..."
kubectl rollout status deployment/mongodb-deployment --timeout=60s
kubectl rollout status deployment/payment-backend-deployment --timeout=60s
kubectl rollout status deployment/payment-gui-deployment --timeout=60s

echo "✅ Phase 2 Cloud Deployment Completed Successfully!"
echo "--------------------------------------------------------"
kubectl get pods,svc,ingress
