import os
import uuid
import logging
import hashlib
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("payment-service")

app = Flask(__name__)
CORS(app)

# Environment variables
MONGO_URI = os.getenv("MONGO_URI", "mongodb://root:password@mongodb:27017/payment_db?authSource=admin")
DB_NAME = os.getenv("DB_NAME", "payment_db")
COLLECTION_NAME = "payments"
AUDIT_COLLECTION = "activity_logs"
CARDS_COLLECTION = "saved_cards"
PROFILE_COLLECTION = "user_profile"
USERS_COLLECTION = "users"

mongo_client = None
db = None

def get_db():
    global mongo_client, db
    if db is not None:
        return db
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        mongo_client.admin.command('ping')
        db = mongo_client[DB_NAME]
        logger.info(f"Connected successfully to MongoDB at {MONGO_URI}")
        return db
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}")
        return None

def hash_password(password):
    """Simple SHA256 password hash for secure MongoDB storage."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def log_activity(action, details, txn_id=None):
    database = get_db()
    if database is not None:
        try:
            database[AUDIT_COLLECTION].insert_one({
                "action": action,
                "details": details,
                "transaction_id": txn_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")

def format_doc(doc):
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    if "password_hash" in doc:
        del doc["password_hash"]
    return doc

# --- Root & Health Endpoints ---
@app.route('/', methods=['GET'])
def root_index():
    return jsonify({
        "service": "SimplePay Payment REST API Service",
        "status": "healthy",
        "health_check": "/health",
        "available_endpoints": {
            "auth_register": "POST /auth/register or POST /api/auth/register",
            "auth_login": "POST /auth/login or POST /api/auth/login",
            "auth_me": "GET /auth/me or GET /api/auth/me",
            "health": "GET /health or GET /api/health",
            "stats": "GET /stats or GET /api/stats",
            "payments_list": "GET /payments or GET /api/payments",
            "payments_create": "POST /payments or POST /api/payments",
            "payment_details": "GET /payments/<id> or GET /api/payments/<id>",
            "payment_refund": "PUT /payments/<id>/refund or PUT /api/payments/<id>/refund",
            "payment_delete": "DELETE /payments/<id> or DELETE /api/payments/<id>",
            "cards_list": "GET /cards or GET /api/cards",
            "cards_add": "POST /cards or POST /api/cards",
            "profile": "GET /profile or GET /api/profile",
            "activity_logs": "GET /activity-logs or GET /api/activity-logs"
        }
    }), 200

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    database = get_db()
    database_status = "connected" if database is not None else "disconnected"
    status_code = 200 if database_status == "connected" else 503
    return jsonify({
        "service": "payment-service",
        "status": "healthy" if status_code == 200 else "degraded",
        "database": database_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), status_code

# Custom JSON 404 Handler
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        "error": "404 Not Found",
        "message": f"Requested URL '{request.path}' was not found. Please check available endpoints at GET /",
        "health_check": "/health",
        "root_index": "/"
    }), 404

# --- Authentication Endpoints ---
@app.route('/auth/register', methods=['POST'])
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid payload"}), 400

        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()
        organization = data.get("organization", "Enterprise Account").strip()

        if not full_name or not email or not password:
            return jsonify({"error": "Full Name, Email, and Password are required"}), 400

        if len(password) < 4:
            return jsonify({"error": "Password must be at least 4 characters long"}), 400

        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        # Check existing user
        existing = database[USERS_COLLECTION].find_one({"email": email})
        if existing:
            return jsonify({"error": "An account with this email address already exists"}), 400

        user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
        auth_token = f"token_{uuid.uuid4().hex}"
        password_hash = hash_password(password)
        now = datetime.now(timezone.utc).isoformat()

        user_doc = {
            "user_id": user_id,
            "full_name": full_name,
            "email": email,
            "password_hash": password_hash,
            "organization": organization,
            "role": "Merchant Administrator",
            "account_status": "Verified Active",
            "auth_token": auth_token,
            "created_at": now
        }

        database[USERS_COLLECTION].insert_one(user_doc)

        # Create user profile record
        profile_doc = {
            "user_id": user_id,
            "full_name": full_name,
            "email": email,
            "organization": organization,
            "role": "Merchant Administrator",
            "account_status": "Verified Active",
            "api_key": f"sk_live_{uuid.uuid4().hex[:16]}",
            "webhook_url": "https://api.simplepay.io/webhooks/v1",
            "email_notifications": True,
            "two_factor_enabled": True,
            "created_at": now
        }
        database[PROFILE_COLLECTION].update_one({"email": email}, {"$set": profile_doc}, upsert=True)

        log_activity("USER_REGISTERED", f"Created new merchant account for {full_name} ({email})", user_id)
        return jsonify({
            "message": "Account created successfully",
            "token": auth_token,
            "user": format_doc(user_doc)
        }), 201

    except Exception as e:
        return jsonify({"error": "Registration failed", "details": str(e)}), 500

@app.route('/auth/login', methods=['POST'])
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid payload"}), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        hashed = hash_password(password)
        user = database[USERS_COLLECTION].find_one({"email": email, "password_hash": hashed})

        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        auth_token = f"token_{uuid.uuid4().hex}"
        database[USERS_COLLECTION].update_one({"_id": user["_id"]}, {"$set": {"auth_token": auth_token, "last_login": datetime.now(timezone.utc).isoformat()}})
        user["auth_token"] = auth_token

        log_activity("USER_LOGGED_IN", f"User {user['full_name']} logged in successfully", user["user_id"])
        return jsonify({
            "message": "Login successful",
            "token": auth_token,
            "user": format_doc(user)
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed", "details": str(e)}), 500

@app.route('/auth/me', methods=['GET'])
@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip()

        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        if token:
            user = database[USERS_COLLECTION].find_one({"auth_token": token})
            if user:
                return jsonify({"user": format_doc(user)}), 200

        # Fallback to default admin profile
        profile = database[PROFILE_COLLECTION].find_one({})
        if profile:
            return jsonify({"user": format_doc(profile)}), 200

        return jsonify({"error": "Unauthenticated"}), 401

    except Exception as e:
        return jsonify({"error": "Auth check failed", "details": str(e)}), 500

# --- Payment Endpoints ---
@app.route('/payments', methods=['POST'])
@app.route('/api/payments', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        customer_name = data.get("customer_name")
        amount = data.get("amount")
        currency = data.get("currency", "USD").upper()
        payment_method = data.get("payment_method", "Credit Card")
        description = data.get("description", "Payment transaction")
        card_last4 = data.get("card_last4", "4242")

        if not customer_name or not isinstance(customer_name, str) or len(customer_name.strip()) == 0:
            return jsonify({"error": "Missing or invalid 'customer_name'"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({"error": "'amount' must be greater than zero"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "'amount' must be a valid positive number"}), 400

        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        transaction_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        status = data.get("status", "SUCCESS").upper()
        if status not in ["SUCCESS", "FAILED", "PENDING"]:
            status = "SUCCESS"

        payment_doc = {
            "transaction_id": transaction_id,
            "customer_name": customer_name.strip(),
            "amount": round(amount, 2),
            "currency": currency,
            "payment_method": payment_method,
            "card_last4": card_last4,
            "description": description,
            "status": status,
            "created_at": now,
            "updated_at": now
        }

        result = database[COLLECTION_NAME].insert_one(payment_doc)
        payment_doc["_id"] = str(result.inserted_id)

        log_activity("PAYMENT_CREATED", f"Processed {currency} ${amount:.2f} for {customer_name}", transaction_id)
        return jsonify({"message": "Payment processed successfully", "data": payment_doc}), 201

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route('/payments', methods=['GET'])
@app.route('/api/payments', methods=['GET'])
def list_payments():
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        search_query = request.args.get('q', '').strip()
        status_filter = request.args.get('status', '').strip().upper()
        method_filter = request.args.get('method', '').strip()

        query = {}
        if status_filter and status_filter != "ALL":
            query["status"] = status_filter
        if method_filter and method_filter != "ALL":
            query["payment_method"] = method_filter

        if search_query:
            query["$or"] = [
                {"customer_name": {"$regex": search_query, "$options": "i"}},
                {"transaction_id": {"$regex": search_query, "$options": "i"}},
                {"payment_method": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}}
            ]

        cursor = database[COLLECTION_NAME].find(query).sort("created_at", -1)
        payments = [format_doc(doc) for doc in cursor]

        return jsonify({"count": len(payments), "data": payments}), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve payments", "details": str(e)}), 500

@app.route('/payments/<payment_id>', methods=['GET'])
@app.route('/api/payments/<payment_id>', methods=['GET'])
def get_payment(payment_id):
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        query = {"transaction_id": payment_id}
        try:
            query = {"$or": [{"_id": ObjectId(payment_id)}, {"transaction_id": payment_id}]}
        except InvalidId:
            pass

        doc = database[COLLECTION_NAME].find_one(query)
        if not doc:
            return jsonify({"error": f"Payment '{payment_id}' not found"}), 404

        return jsonify({"data": format_doc(doc)}), 200
    except Exception as e:
        return jsonify({"error": "Failed to retrieve payment details", "details": str(e)}), 500

@app.route('/payments/<payment_id>/refund', methods=['PUT'])
@app.route('/api/payments/<payment_id>/refund', methods=['PUT'])
def refund_payment(payment_id):
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        query = {"transaction_id": payment_id}
        try:
            query = {"$or": [{"_id": ObjectId(payment_id)}, {"transaction_id": payment_id}]}
        except InvalidId:
            pass

        doc = database[COLLECTION_NAME].find_one(query)
        if not doc:
            return jsonify({"error": f"Payment '{payment_id}' not found"}), 404

        if doc.get("status") == "REFUNDED":
            return jsonify({"message": "Payment has already been refunded", "data": format_doc(doc)}), 200

        now = datetime.now(timezone.utc).isoformat()
        database[COLLECTION_NAME].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "REFUNDED", "refunded_at": now, "updated_at": now}}
        )

        doc["status"] = "REFUNDED"
        doc["refunded_at"] = now
        log_activity("PAYMENT_REFUNDED", f"Refunded ${doc['amount']:.2f} to {doc['customer_name']}", doc['transaction_id'])
        return jsonify({"message": "Refund processed successfully", "data": format_doc(doc)}), 200

    except Exception as e:
        return jsonify({"error": "Failed to process refund", "details": str(e)}), 500

@app.route('/payments/<payment_id>', methods=['DELETE'])
@app.route('/api/payments/<payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        query = {"transaction_id": payment_id}
        try:
            query = {"$or": [{"_id": ObjectId(payment_id)}, {"transaction_id": payment_id}]}
        except InvalidId:
            pass

        result = database[COLLECTION_NAME].delete_one(query)
        if result.deleted_count == 0:
            return jsonify({"error": f"Payment '{payment_id}' not found"}), 404

        log_activity("PAYMENT_DELETED", f"Deleted transaction record {payment_id}", payment_id)
        return jsonify({"message": f"Payment '{payment_id}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete payment", "details": str(e)}), 500

# --- Saved Credit Cards Endpoints ---
@app.route('/cards', methods=['GET'])
@app.route('/api/cards', methods=['GET'])
def list_cards():
    try:
        database = get_db()
        if database is None:
            return jsonify({"data": []}), 200

        cursor = database[CARDS_COLLECTION].find().sort("created_at", -1)
        cards = [format_doc(doc) for doc in cursor]
        
        if not cards:
            seed_cards = [
                {
                    "card_id": "CARD-VISA-9041",
                    "cardholder_name": "ALEXANDER BISHT",
                    "brand": "Visa",
                    "last4": "4242",
                    "exp_month": "12",
                    "exp_year": "2028",
                    "is_default": True,
                    "color_gradient": "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                {
                    "card_id": "CARD-MC-5582",
                    "cardholder_name": "ALEXANDER BISHT",
                    "brand": "Mastercard",
                    "last4": "8812",
                    "exp_month": "09",
                    "exp_year": "2027",
                    "is_default": False,
                    "color_gradient": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            ]
            database[CARDS_COLLECTION].insert_many(seed_cards)
            cursor = database[CARDS_COLLECTION].find().sort("created_at", -1)
            cards = [format_doc(doc) for doc in cursor]

        return jsonify({"data": cards}), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch cards", "details": str(e)}), 500

@app.route('/cards', methods=['POST'])
@app.route('/api/cards', methods=['POST'])
def add_card():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        cardholder_name = data.get("cardholder_name", "").strip().upper()
        card_number = str(data.get("card_number", "")).replace(" ", "").replace("-", "")
        exp_month = str(data.get("exp_month", "12")).zfill(2)
        exp_year = str(data.get("exp_year", "2028"))

        if not cardholder_name or len(cardholder_name) < 2:
            return jsonify({"error": "Valid Cardholder Name is required"}), 400

        if len(card_number) < 12 or not card_number.isdigit():
            return jsonify({"error": "Invalid credit card number"}), 400

        last4 = card_number[-4:]
        brand = "Visa"
        if card_number.startswith("5"): brand = "Mastercard"
        elif card_number.startswith("3"): brand = "American Express"
        elif card_number.startswith("6"): brand = "Discover"

        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        card_id = f"CARD-{uuid.uuid4().hex[:8].upper()}"
        card_doc = {
            "card_id": card_id,
            "cardholder_name": cardholder_name,
            "brand": brand,
            "last4": last4,
            "exp_month": exp_month,
            "exp_year": exp_year,
            "is_default": False,
            "color_gradient": "linear-gradient(135deg, #10b981 0%, #059669 100%)" if brand == "Visa" else "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        result = database[CARDS_COLLECTION].insert_one(card_doc)
        card_doc["_id"] = str(result.inserted_id)

        log_activity("CARD_ADDED", f"Saved new {brand} card ending in ****{last4} for {cardholder_name}")
        return jsonify({"message": "Credit Card added successfully", "data": card_doc}), 201

    except Exception as e:
        return jsonify({"error": "Failed to add credit card", "details": str(e)}), 500

@app.route('/cards/<card_id>', methods=['PUT'])
@app.route('/api/cards/<card_id>', methods=['PUT'])
def update_card(card_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid payload"}), 400

        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        update_fields = {}
        if "cardholder_name" in data: update_fields["cardholder_name"] = str(data["cardholder_name"]).strip().upper()
        if "exp_month" in data: update_fields["exp_month"] = str(data["exp_month"]).zfill(2)
        if "exp_year" in data: update_fields["exp_year"] = str(data["exp_year"])

        database[CARDS_COLLECTION].update_one({"card_id": card_id}, {"$set": update_fields})
        log_activity("CARD_UPDATED", f"Updated credit card details for {card_id}")
        return jsonify({"message": f"Card '{card_id}' updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to update card", "details": str(e)}), 500

@app.route('/cards/<card_id>/default', methods=['PUT'])
@app.route('/api/cards/<card_id>/default', methods=['PUT'])
def set_default_card(card_id):
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        database[CARDS_COLLECTION].update_many({}, {"$set": {"is_default": False}})
        database[CARDS_COLLECTION].update_one({"card_id": card_id}, {"$set": {"is_default": True}})
        
        log_activity("CARD_DEFAULT_CHANGED", f"Set card {card_id} as default payment method")
        return jsonify({"message": f"Card '{card_id}' is now your default card."}), 200

    except Exception as e:
        return jsonify({"error": "Failed to set default card", "details": str(e)}), 500

@app.route('/cards/<card_id>', methods=['DELETE'])
@app.route('/api/cards/<card_id>', methods=['DELETE'])
def delete_card(card_id):
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database service unavailable"}), 503

        result = database[CARDS_COLLECTION].delete_one({"card_id": card_id})
        if result.deleted_count == 0:
            return jsonify({"error": f"Card '{card_id}' not found"}), 404

        log_activity("CARD_DELETED", f"Removed card {card_id}")
        return jsonify({"message": f"Card '{card_id}' removed successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to delete card", "details": str(e)}), 500

# --- User Profile Endpoints ---
@app.route('/profile', methods=['GET'])
@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        profile = database[PROFILE_COLLECTION].find_one({})
        if not profile:
            profile = {
                "full_name": "Alexander Bisht",
                "email": "admin@antipay.io",
                "role": "Chief Technology Officer / Administrator",
                "organization": "AntiPay Enterprise Corp",
                "account_status": "Verified Active",
                "api_key": "sk_live_9f82a10b4c739e1204d",
                "webhook_url": "https://api.simplepay.io/webhooks/v1",
                "email_notifications": True,
                "two_factor_enabled": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            database[PROFILE_COLLECTION].insert_one(profile)
            profile["_id"] = str(profile["_id"])
        else:
            profile = format_doc(profile)

        return jsonify({"data": profile}), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch profile", "details": str(e)}), 500

@app.route('/profile', methods=['PUT'])
@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid payload"}), 400

        database = get_db()
        if database is None:
            return jsonify({"error": "Database unavailable"}), 503

        update_fields = {}
        for key in ["full_name", "email", "organization", "webhook_url", "email_notifications", "two_factor_enabled"]:
            if key in data:
                update_fields[key] = data[key]

        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Update existing profile
        database[PROFILE_COLLECTION].update_one({}, {"$set": update_fields}, upsert=True)

        # Also update cardholder name on default saved card if name changed
        if "full_name" in data and data["full_name"]:
            database[CARDS_COLLECTION].update_many({}, {"$set": {"cardholder_name": data["full_name"].strip().upper()}})

        log_activity("PROFILE_UPDATED", f"Updated profile for {data.get('full_name', 'user')}")
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to update profile", "details": str(e)}), 500

@app.route('/activity-logs', methods=['GET'])
@app.route('/api/activity-logs', methods=['GET'])
def get_activity_logs():
    try:
        database = get_db()
        if database is None: return jsonify({"data": []}), 200

        cursor = database[AUDIT_COLLECTION].find().sort("timestamp", -1).limit(25)
        logs = [format_doc(doc) for doc in cursor]
        return jsonify({"data": logs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stats', methods=['GET'])
@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        database = get_db()
        if database is None:
            return jsonify({
                "total_transactions": 0, "total_volume": 0.0, "success_rate": 0.0,
                "status_counts": {}, "method_counts": {}
            }), 200

        pipeline_status = [{"$group": {"_id": "$status", "count": {"$sum": 1}, "sum_amount": {"$sum": "$amount"}}}]
        pipeline_method = [{"$group": {"_id": "$payment_method", "count": {"$sum": 1}, "sum_amount": {"$sum": "$amount"}}}]

        status_results = list(database[COLLECTION_NAME].aggregate(pipeline_status))
        method_results = list(database[COLLECTION_NAME].aggregate(pipeline_method))

        status_counts = {"SUCCESS": 0, "FAILED": 0, "PENDING": 0, "REFUNDED": 0}
        method_counts = {}
        total_volume = 0.0
        total_txns = 0

        for item in status_results:
            st = item["_id"]
            cnt = item["count"]
            vol = item["sum_amount"]
            status_counts[st] = cnt
            total_txns += cnt
            if st in ["SUCCESS", "REFUNDED"]: total_volume += vol

        for item in method_results:
            method_counts[item["_id"]] = item["count"]

        success_cnt = status_counts.get("SUCCESS", 0)
        success_rate = round((success_cnt / total_txns * 100), 1) if total_txns > 0 else 0.0

        return jsonify({
            "total_transactions": total_txns,
            "total_volume": round(total_volume, 2),
            "success_rate": success_rate,
            "status_counts": status_counts,
            "method_counts": method_counts,
            "currency": "USD"
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve statistics", "details": str(e)}), 500

@app.route('/seed', methods=['POST'])
@app.route('/api/seed', methods=['POST'])
def seed_data():
    try:
        database = get_db()
        if database is None: return jsonify({"error": "Database service unavailable"}), 503

        if database[COLLECTION_NAME].count_documents({}) > 0:
            return jsonify({"message": "Database already contains payment records."}), 200

        seed_records = [
            {
                "transaction_id": "TXN-8F92A1B0",
                "customer_name": "Alice Johnson",
                "amount": 250.00,
                "currency": "USD",
                "payment_method": "Credit Card",
                "card_last4": "4242",
                "description": "Monthly SaaS Enterprise Tier",
                "status": "SUCCESS",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "transaction_id": "TXN-7E41C9D2",
                "customer_name": "Bob Smith",
                "amount": 1200.50,
                "currency": "USD",
                "payment_method": "Apple Pay",
                "card_last4": "8812",
                "description": "High-Performance Cloud Server Cluster",
                "status": "SUCCESS",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "transaction_id": "TXN-3B10E5F4",
                "customer_name": "Charlie Davis",
                "amount": 75.25,
                "currency": "EUR",
                "payment_method": "Google Pay",
                "card_last4": "1092",
                "description": "SSL Certificate Renewal",
                "status": "FAILED",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        database[COLLECTION_NAME].insert_many(seed_records)
        log_activity("DATABASE_SEEDED", f"Seeded {len(seed_records)} sample payment records.")
        return jsonify({"message": f"Successfully seeded {len(seed_records)} payment records."}), 201

    except Exception as e:
        return jsonify({"error": "Seeding failed", "details": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
