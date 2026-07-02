# Hostel Allocation System

An automated, secure, and role-based hostel allocation portal designed to streamline student housing applications, merit-based room assignments, roommate matching, and live hostel occupancy tracking.

## Features

### Admin

* Manage hostel blocks and rooms.
* Add and update room capacities.
* Manage student records.
* Monitor hostel occupancy in real time.
* Perform merit-based room allocation.
* Manage user roles and permissions.

### Student

* Register using an institutional email address.
* Enter academic details (CGPA, Year of Study) for merit tracking.
* Select ranked room preferences (Block, Single, Double, or Triple).
* Send and accept mutual roommate requests using roll numbers.
* View confirmed room allocations and roommate information through a personalized dashboard.

---

## Tech Stack

* **Frontend:** React, Vite
* **Backend:** Node.js, Express.js
* **Database:** MySQL 8+
* **Authentication:** JWT
* **Version Control:** Git

---

## System Requirements

* Node.js v18.0.0 or higher
* MySQL v8.0 or higher
* Git
* PM2 (recommended for production deployment)

---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/Hostel_Allocation.git
cd Hostel_Allocation
```

### 2. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Edit the `.env` file and configure:

* `DB_USER`
* `DB_PASSWORD`
* `ADMIN_EMAIL`
* `ADMIN_PASSWORD`
* `PORT=5001`

Initialize the database:

```bash
node db-init.js
```

Expected output:

```text
✅ Database 'hostel_allocation_db' is ready!
✅ All tables initialized successfully!
```

Start the backend server:

```bash
node server.js
```

The backend runs on **http://localhost:5001**.

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd Frontend
npm install
cp .env.example .env
```

Configure the frontend environment:

```env
VITE_API_BASE_URL=http://localhost:5001
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at:

**http://localhost:3080**

---

## Production Deployment

### Backend

```bash
cd Backend
pm2 start server.js --name "hostel-backend"
```

Ensure the `.env` file contains:

* Production database credentials
* SMTP credentials
* `NODE_ENV=production`
* `PORT=5001`

### Frontend

```bash
cd Frontend
npm run build
```

The production-ready files will be generated in the `dist/` folder.

---

## Server Configuration

* Serve the `Frontend/dist` directory using **Nginx** or **Apache**.
* Configure a reverse proxy to forward `/api` requests to the backend running on **Port 5001**.
* Enable Single Page Application (SPA) fallback by redirecting unknown routes to `index.html`.

---

## Project Structure

```text
Hostel_Allocation/
├── Backend/
│   ├── server.js
│   ├── db-init.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── .env.example
│
├── Frontend/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── package.json
│
└── README.md
```
