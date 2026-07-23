import os
import logging
import requests
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("gui-service")

app = Flask(__name__)

# Backend REST API endpoint configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://payment-service:5000").rstrip("/")

def call_backend(endpoint, method="GET", json_data=None, params=None, headers=None):
    url = f"{BACKEND_URL}{endpoint}"
    req_headers = headers or {}
    
    # Forward the client's Authorization token if present in request context
    from flask import has_request_context, request
    if has_request_context() and "Authorization" in request.headers:
        req_headers["Authorization"] = request.headers["Authorization"]
        
    try:
        if method == "GET":
            res = requests.get(url, params=params, headers=req_headers, timeout=5)
        elif method == "POST":
            res = requests.post(url, json=json_data, headers=req_headers, timeout=5)
        elif method == "PUT":
            res = requests.put(url, json=json_data, headers=req_headers, timeout=5)
        elif method == "DELETE":
            res = requests.delete(url, headers=req_headers, timeout=5)
        else:
            return {"error": "Unsupported HTTP method"}, 400
        
        return res.json(), res.status_code
    except Exception as e:
        logger.error(f"Failed to communicate with backend at {url}: {e}")
        return {"error": "Payment Service API is unavailable", "details": str(e)}, 503

# --- Core React SPA Platform Pages ---
@app.route('/')
@app.route('/login')
@app.route('/register')
@app.route('/payments')
@app.route('/cards')
@app.route('/qr-payments')
@app.route('/profile')
@app.route('/analytics')
@app.route('/api-inspector')
def index():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'index.html')

# Healthcheck endpoint for Docker Compose
@app.route('/health')
@app.route('/_stcore/health')
def health_check():
    backend_data, status_code = call_backend('/health')
    backend_healthy = status_code == 200
    
    return jsonify({
        "service": "gui-service",
        "status": "healthy",
        "backend_connected": backend_healthy,
        "backend_url": BACKEND_URL
    }), 200

# --- API Proxy Endpoints for Authentication ---
@app.route('/api/proxy/auth/register', methods=['POST'])
def proxy_auth_register():
    data, code = call_backend('/auth/register', method='POST', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/auth/login', methods=['POST'])
def proxy_auth_login():
    data, code = call_backend('/auth/login', method='POST', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/auth/me', methods=['GET'])
def proxy_auth_me():
    auth_header = request.headers.get("Authorization", "")
    headers = {"Authorization": auth_header} if auth_header else None
    data, code = call_backend('/auth/me', method='GET', headers=headers)
    return jsonify(data), code

# --- API Proxy Endpoints for Frontend AJAX ---
@app.route('/api/proxy/health', methods=['GET'])
def proxy_health():
    data, code = call_backend('/health')
    return jsonify(data), code

@app.route('/api/proxy/stats', methods=['GET'])
def proxy_stats():
    data, code = call_backend('/api/stats')
    return jsonify(data), code

@app.route('/api/proxy/payments', methods=['GET'])
def proxy_list_payments():
    params = {
        'q': request.args.get('q', ''),
        'status': request.args.get('status', ''),
        'method': request.args.get('method', '')
    }
    data, code = call_backend('/api/payments', method='GET', params=params)
    return jsonify(data), code

@app.route('/api/proxy/payments', methods=['POST'])
def proxy_create_payment():
    data, code = call_backend('/api/payments', method='POST', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/payments/<payment_id>', methods=['GET'])
def proxy_get_payment(payment_id):
    data, code = call_backend(f'/api/payments/{payment_id}', method='GET')
    return jsonify(data), code

@app.route('/api/proxy/payments/<payment_id>/refund', methods=['PUT'])
def proxy_refund_payment(payment_id):
    data, code = call_backend(f'/api/payments/{payment_id}/refund', method='PUT')
    return jsonify(data), code

@app.route('/api/proxy/payments/<payment_id>', methods=['DELETE'])
def proxy_delete_payment(payment_id):
    data, code = call_backend(f'/api/payments/{payment_id}', method='DELETE')
    return jsonify(data), code

# Saved Cards Proxies
@app.route('/api/proxy/cards', methods=['GET'])
def proxy_list_cards():
    data, code = call_backend('/api/cards', method='GET')
    return jsonify(data), code

@app.route('/api/proxy/cards', methods=['POST'])
def proxy_add_card():
    data, code = call_backend('/api/cards', method='POST', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/cards/<card_id>', methods=['PUT'])
def proxy_update_card(card_id):
    data, code = call_backend(f'/api/cards/{card_id}', method='PUT', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/cards/<card_id>/default', methods=['PUT'])
def proxy_set_default_card(card_id):
    data, code = call_backend(f'/api/cards/{card_id}/default', method='PUT')
    return jsonify(data), code

@app.route('/api/proxy/cards/<card_id>', methods=['DELETE'])
def proxy_delete_card(card_id):
    data, code = call_backend(f'/api/cards/{card_id}', method='DELETE')
    return jsonify(data), code

# Profile Proxies
@app.route('/api/proxy/profile', methods=['GET'])
def proxy_get_profile():
    data, code = call_backend('/api/profile', method='GET')
    return jsonify(data), code

@app.route('/api/proxy/profile', methods=['PUT'])
def proxy_update_profile():
    data, code = call_backend('/api/profile', method='PUT', json_data=request.get_json())
    return jsonify(data), code

@app.route('/api/proxy/activity-logs', methods=['GET'])
def proxy_activity_logs():
    data, code = call_backend('/api/activity-logs', method='GET')
    return jsonify(data), code

@app.route('/api/proxy/seed', methods=['POST'])
def proxy_seed():
    data, code = call_backend('/api/seed', method='POST')
    return jsonify(data), code

if __name__ == '__main__':
    port = int(os.getenv("PORT", 8501))
    app.run(host='0.0.0.0', port=port, debug=False)
