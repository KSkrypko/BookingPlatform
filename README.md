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
* GET /api/bookings (JWT required; clients see their bookings, providers see bookings for their services)
* POST /api/bookings

### Availability
* GET /api/availability?serviceId={id}&date=YYYY-MM-DD


## ⚙️ Architecture

Frontend (React) communicates with Symfony API using HTTP requests.
Backend handles business logic and database operations with Doctrine ORM.
PostgreSQL runs in Docker with persistent volumes.

## Booking data ownership

New bookings belong to the authenticated client. New services belong to the authenticated provider.
Ownership is determined on the server; request parameters and contact email addresses cannot change it.
`GET /api/bookings` keeps its existing response format and requires a bearer token.

Migration `Version20261018150000` adds nullable ownership columns without assigning or modifying historical records.
Bookings without a client remain hidden from both clients and providers. Services without a provider remain in the
public catalog, but no provider can read their bookings. Any historical ownership assignment requires independently
verified data and a separate migration decision; matching contact emails is not sufficient.

The booking-to-service foreign key is added as `NOT VALID` to preserve any existing orphaned service references.
PostgreSQL enforces the constraint for new writes. Historical references must be audited before explicitly validating
the constraint. The migration is irreversible to prevent silently discarding ownership data on rollback.

## Backend tests

Run `cd api && php vendor/bin/phpunit`. Functional tests use an in-memory SQLite database and generate temporary
JWT keys in memory. They require `pdo_sqlite` and OpenSSL and do not connect to the application's PostgreSQL database.

The `migration` test group requires `pdo_pgsql` and a separate, temporary PostgreSQL database named
`booking_platform_migration_test`. It creates and removes its own random schema and runs the actual Doctrine migrations.
Run it with:

```bash
cd api
MIGRATION_DATABASE_URL='postgresql://booking_test:booking_test@127.0.0.1:5432/booking_platform_migration_test' php vendor/bin/phpunit --group migration --fail-on-skipped
```

Without `MIGRATION_DATABASE_URL`, the migration test is skipped. CI provides a temporary PostgreSQL service and runs
this group separately, treating a skipped migration test as a failure.
