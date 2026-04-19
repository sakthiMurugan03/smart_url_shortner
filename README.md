# 🔗 Smart URL Shortener

A full-stack URL shortener with **real-time analytics, geo tracking, and API-based access control**, built using FastAPI, React, Redis, and WebSockets.

---

## 🚀 Features

* 🔗 URL Shortening (custom alias support)
* 📊 Real-time Analytics Dashboard
* 👥 Unique Visitor Tracking (IP-based)
* 📈 Daily & Hourly Click Trends
* ⚡ Live Updates via WebSockets
* 🌍 Geo-location Tracking (Country-based)
* 📱 Device Detection (Mobile/Desktop)
* 🔐 API Key Authentication + Rate Limiting
* 📥 Export Analytics as CSV
* 🔳 QR Code Generation

---

## 🛠️ Tech Stack

**Backend**

* FastAPI
* SQLAlchemy
* MySQL

**Frontend**

* React (Vite)
* Recharts

**Other**

* Redis (Caching + Rate Limiting)
* WebSockets (Real-time updates)
* GeoLite2 (Geo-location tracking)
* REST APIs

---

## 📂 Project Structure

```
smart_url_shortner/
│
├── app/                     # Backend (FastAPI)
│   ├── main.py
│   ├── routes.py
│   ├── models.py
│   ├── database.py
│   ├── geo.py
│   ├── cache.py
│   ├── websocket_manager.py
│   ├── queue.py
│   └── __init__.py
│
├── frontend/                # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## ▶️ How to Run Locally

### Backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Endpoints

| Endpoint               | Description              |
| ---------------------- | ------------------------ |
| POST /generate-api-key | Generate API key         |
| POST /shorten          | Create short URL         |
| GET /analytics/{code}  | Get analytics data       |
| GET /export/{code}     | Export analytics as CSV  |
| GET /{code}            | Redirect to original URL |

---

## 📊 Analytics Includes

* Total clicks
* Unique users
* Daily trends
* Hourly trends
* Device breakdown
* Country distribution
* Recent click logs (IP, device, timestamp)

---

## 📊 Demo

* Generate API key
* Shorten a URL
* Open short link
* View real-time analytics dashboard
* Export analytics as CSV

---

## 📸 Screenshots

<img width="2560" height="1624" alt="image" src="https://github.com/user-attachments/assets/10163d4d-1213-4cef-8fbf-c2c405c978a9" />
<img width="2560" height="914" alt="image" src="https://github.com/user-attachments/assets/6dbfedee-9bfe-4448-b8b0-edf66c5c2f88" />
<img width="2560" height="1506" alt="image" src="https://github.com/user-attachments/assets/6cdb8994-11fb-472c-a173-d9fb1a4cea06" />
<img width="1142" height="726" alt="image" src="https://github.com/user-attachments/assets/03bbdf1d-ba73-421a-8a71-ae2a4f116a0b" />
<img width="738" height="694" alt="image" src="https://github.com/user-attachments/assets/48345ca1-56b2-42b1-bd91-ba2a8fd8e0ab" />

---

## 🎯 Future Improvements

* 🌍 City-level geo tracking
* 📱 Advanced device detection (User-Agent parsing)
* 📊 Live updating charts without refresh
* ☁️ Deployment (AWS / Render / Railway)
* 🔑 OAuth / User authentication

---

## 👤 Author

**Sakthi Murugan**
