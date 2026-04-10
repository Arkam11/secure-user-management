# 🔐 Secure User Management System

A production-style full-stack application built with NestJS, PostgreSQL, Redis, WebSocket, and Next.js.

## ✨ Features

- **JWT Authentication** with Access + Refresh Token + Blacklist
- **Role-Based Access Control** (Admin / User)
- **Real-Time Notifications** via WebSocket (Socket.io)
- **Winston Logging** with file and console transports
- **Redis-backed Rate Limiting** on auth endpoints
- **Swagger API Documentation**
- **Docker Compose** for one-command setup
- **Next.js Frontend** with Admin Dashboard
- **Unit Tests** with Jest (14 tests)
- **CI/CD Pipeline** with GitHub Actions
- **Pagination & Filtering** on user listing
- **Audit Logs** for all important actions
- **Refresh Token Blacklist**

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + NestJS |
| Database | PostgreSQL + TypeORM |
| Cache/Rate Limiting | Redis + ioredis |
| Authentication | JWT (Access + Refresh) |
| Real-Time | WebSocket (Socket.io) |
| Logging | Winston |
| API Docs | Swagger (OpenAPI 3.0) |
| Frontend | Next.js 16 + Tailwind CSS |
| State Management | Zustand |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Testing | Jest |

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- Docker Desktop installed and running

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Arkam11/secure-user-management.git
cd secure-user-management

# 2. Copy environment files
cp backend/.env.example backend/.env

# 3. Start everything with Docker
docker-compose up -d

# 4. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Swagger Docs: http://localhost:3001/api/docs
```

## 💻 Local Development Setup

### Prerequisites
- Node.js v20+
- Docker Desktop (for PostgreSQL and Redis)

### Step 1 — Start database services
```bash
docker-compose up -d postgres redis
```

### Step 2 — Setup Backend
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

### Step 3 — Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### Step 4 — Open the app
- Frontend: http://localhost:3000
- Swagger Docs: http://localhost:3001/api/docs

## 📋 Default Admin Account

After first run, register a user then promote to admin:

```bash
docker exec -it user_mgmt_postgres psql -U postgres -d user_management \
  -c "UPDATE users SET role='admin' WHERE email='your@email.com';"
```

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | Public |
| POST | /api/auth/login | Login | Public |
| POST | /api/auth/refresh | Refresh token | Public |
| POST | /api/auth/logout | Logout | Required |
| GET | /api/auth/profile | Get profile | Required |

### Users
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | /api/users | Create user | Admin |
| GET | /api/users | Get all users | Admin |
| GET | /api/users/:id | Get user by ID | Admin/Self |
| PUT | /api/users/:id | Update user | Admin/Self |
| DELETE | /api/users/:id | Delete user | Admin |

## 🔌 WebSocket Events

Connect to: `ws://localhost:3001/notifications`

| Event | Trigger |
|-------|---------|
| `notification` | User created/updated/deleted/login |
| `ping` | Client keepalive |
| `pong` | Server response |

## 🧪 Running Tests

```bash
cd backend
npm test
```

## 📁 Project Structure

```
secure-user-management/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # JWT auth module
│   │   ├── users/            # User CRUD module
│   │   ├── websocket/        # WebSocket gateway
│   │   ├── logging/          # Winston logger
│   │   ├── common/           # Guards, decorators, filters
│   │   ├── config/           # Config files
│   │   └── database/         # TypeORM entities
│   └── test/                 # E2E tests
├── frontend/                 # Next.js app
│   └── app/
│       ├── login/            # Login page
│       ├── register/         # Register page
│       └── dashboard/        # Admin dashboard + profile
├── .github/workflows/        # CI/CD pipeline
├── docker-compose.yml        # Docker setup
└── README.md
```

## 🌍 Environment Variables

See `backend/.env.example` for all required variables.