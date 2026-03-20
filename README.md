# BookingPlatform

Full-stack appointment booking system built with **Symfony API**, **React (Vite)** and **PostgreSQL (Docker)**.

## ✨ Features

* View available services
* Create a booking (name, email, date)
* Form validation (required fields + email format)
* Real-time API communication
* Error handling and user feedback

## 🧱 Tech Stack

### Frontend

* React + TypeScript
* Vite
* Fetch API

### Backend

* Symfony 7 (REST API)
* PHP 8

### Database

* PostgreSQL
* Docker (with volumes)

## 🚀 Getting Started

### 1. Clone repository

```bash
git clone https://github.com/KSkrypko/BookingPlatform.git
cd BookingPlatform
```

## 🚀 Running the project

### Backend (API)

```bash
cd api
docker compose up -d
php bin/console doctrine:schema:update --force
php -S 127.0.0.1:8000 -t public
```

### Frontend

```bash
cd web
npm install
npm run dev
```

App runs on:

http://localhost:5173


## 🔌 API Endpoints

* GET /api/services
* GET /api/bookings
* POST /api/bookings


## ⚙️ Architecture

Frontend (React) communicates with Symfony API using HTTP requests.
Backend handles business logic and database operations with Doctrine ORM.
PostgreSQL runs in Docker with persistent volumes.