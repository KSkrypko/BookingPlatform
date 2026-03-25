# BookingPlatform

Full-stack appointment booking system built with **Symfony API**, **React (Vite)** and **PostgreSQL (Docker)**.

## ✨ Features

- Browse available services
- Create bookings with selected date and time
- Real-time validation (required fields, email format)
- View existing bookings
- Check available time slots for a selected service and date (availability system)
- Fullstack communication between React frontend and Symfony API
- Error handling and user feedback

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
docker compose up --build -d
docker compose exec php composer install
docker compose exec php php bin/console doctrine:migrations:migrate
```

### Frontend

```bash
cd web
npm install
npm run dev
```

## 🔌 API Endpoints

### Services
* GET /api/services

### Bookings
* GET /api/bookings
* POST /api/bookings

### Availability
* GET /api/availability?serviceId={id}&date=YYYY-MM-DD


## ⚙️ Architecture

Frontend (React) communicates with Symfony API using HTTP requests.
Backend handles business logic and database operations with Doctrine ORM.
PostgreSQL runs in Docker with persistent volumes.