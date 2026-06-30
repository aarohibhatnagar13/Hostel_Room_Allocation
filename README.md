# LNMIIT Teaching Assistant (TA) Allocation Portal

An automated, secure, and role-based portal designed for The LNM Institute of Information Technology to manage Teaching Assistant applications, algorithmic slot allocations, and attendance tracking.

---

## System Requirements

* Node.js v18.0.0 or higher
* MySQL v8.0 or higher
* Git (for version control)
* PM2 (Recommended for production backend management)

---

## Local Setup & Installation Guide

Follow these exact steps to set up the portal on a local server or IT machine. The project is split into two independent parts: **Backend** and **Frontend**.

### Step 1: Database & Backend Setup

Open your terminal and run the following commands:

```bash
git clone https://github.com/JainAyush-01/TA_Allocation.git
cd TA_Allocation/Backend
npm install
cp .env.example .env
```

> Open `Backend/.env` and fill in your actual MySQL credentials (`DB_USER`, `DB_PASSWORD`) and configure your Admin Email/Password.

Run the initialization script to auto-create the database:

```bash
npm run db:init
```

You should see:

```text
Database 'lnmiit_ta_db' is ready!
```

Start the backend server:

```bash
npm start
```

The backend will start on **Port 5000** and automatically sync all database tables.

---

### Step 2: Frontend Setup

Open a second terminal window, navigate to the project folder, and run:

```bash
cd TA_Allocation/Frontend
npm install
cp .env.example .env
```

Ensure the following is present in `Frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend server:

```bash
npm run dev
```

The frontend will start on **Port 3080**.

Open:

```text
http://localhost:3080
```

in your browser.

---

## System Roles & Access

### Admin

**Access:** `http://localhost:3080/admin`

Capabilities:

* Upload Lab CSVs
* Run allocation algorithm
* Manage timelines
* Manage Lab Managers

---

### Lab Manager

**Access:** `http://localhost:3080/admin`

Capabilities:

* View attendance registries
* Mark TAs present/absent
* Export CSV reports

Added manually by the Admin.

---

### Student

**Access:** `http://localhost:3080/`

Capabilities:

* Register using `@lnmiit.ac.in` email
* Input CGPA
* Select lab availability
* View confirmed allocations

---

## Production Deployment Notes

Since this repository is completely decoupled, please follow standard deployment procedures for isolated Frontend and Backend applications.

### 1. Backend (Node.js API)

Navigate to the `Backend` folder.

Ensure the `.env` file contains production database and SMTP credentials.

Start the server using PM2:

```bash
pm2 start server.js --name "ta-backend"
```

---

### 2. Frontend (React UI)

Navigate to the `Frontend` folder.

Ensure `VITE_API_BASE_URL` in `.env` points to the live production API URL.

Build the frontend:

```bash
npm run build
```

The production-ready files will be generated inside the `dist/` folder.

---

### 3. Server Admin Routing (IT Setup)

* Use a web server such as Nginx or Apache to serve the `Frontend/dist/` folder.
* Configure a reverse proxy to route all `/api` traffic to the Node.js backend running on Port 5000.
* Ensure SPA fallback routing is configured to redirect requests back to `index.html`.
