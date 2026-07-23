# SimplePay Dashboard 💳

A full-stack, 3-tier payment application dashboard built with **Python Flask (GUI Web App)**, **Flask (REST API Backend)**, and **MongoDB**, containerized using **Docker**.

## 🌐 Live Demo
Access the live production deployment hosted on Render and MongoDB Atlas:
👉 **[https://simplepay-946w.onrender.com](https://simplepay-946w.onrender.com)**

---

## 🏗️ Architecture Stack

* **Frontend**: Python Flask GUI serving a compiled React Single Page Application (SPA).
* **Backend**: Python Flask REST API processing payment operations.
* **Database**: MongoDB (Local Docker container for development, MongoDB Atlas for production).

```mermaid
graph TD
    User([🌐 Browser]) -->|Port 8501| GUI[🖥️ Flask GUI App]
    GUI -->|Port 5000| API[⚡ Flask Backend API]
    API -->|Port 27017| DB[(🛢️ MongoDB)]
```
