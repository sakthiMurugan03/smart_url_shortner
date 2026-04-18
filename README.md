# 🔗 Smart URL Shortener

A full-stack URL shortener with **real-time analytics** built using FastAPI, React, and WebSockets.

---

## 🚀 Features

* 🔗 URL Shortening (Base62 encoding)
* 📊 Real-time Analytics Dashboard
* 👥 Unique Visitor Tracking (IP-based)
* 📈 Daily Click Trends (Charts)
* ⚡ Live Updates via WebSockets
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

* WebSockets
* REST APIs

---

## 📂 Project Structure

smart_url_shortner/
├── app/
    ├── frontend/
    ├── requirements.txt
    ├── README.md

---

## ▶️ How to Run Locally

### Backend

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Demo

* Shorten a URL
* Open short link
* View live analytics dashboard

---

## 📸 Screenshots

<img width="1796" height="992" alt="image" src="https://github.com/user-attachments/assets/d9ed0e9a-0dff-4a77-b290-76beb2896819" />
<img width="1796" height="1606" alt="image" src="https://github.com/user-attachments/assets/9037ab4f-dc68-4132-b0ee-d7118fcbca70" />
<img width="1654" height="1030" alt="image" src="https://github.com/user-attachments/assets/c55f9a35-a3a5-434e-af19-72eb9024ce5e" />

---

## 🎯 Future Improvements

* Redis caching
* Geo-location analytics
* API key system
* Deployment (Railway / Fly.io)

---

## 👤 Author

**Sakthi Murugan**
