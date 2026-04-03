# Finance Dashboard Backend

A RESTful backend API for a finance dashboard system with role-based access control, built with Node.js, Express, and PostgreSQL.

---

## Tech Stack

| Layer       | Choice                  | Reason                                              |
|-------------|-------------------------|-----------------------------------------------------|
| Runtime     | Node.js + Express       | Lightweight, fast to iterate, widely used           |
| Database    | PostgreSQL (via Docker) | Production-grade relational DB, strong for finance  |
| Auth        | JWT (jsonwebtoken)      | Stateless, standard for REST APIs                   |
| Validation  | express-validator       | Declarative, composable input validation            |
| API Docs    | Swagger (swagger-jsdoc) | Auto-generated, interactive docs from JSDoc comments|
| Password    | bcryptjs                | Industry-standard password hashing                 |

---

## Role Model

| Role    | Records (read) | Records (write) | Dashboard | User management |
|---------|:--------------:|:---------------:|:---------:|:---------------:|
| viewer  | ✗              | ✗               | ✓         | ✗               |
| analyst | ✓              | ✗               | ✓         | ✗               |
| admin   | ✓              | ✓               | ✓         | ✓               |

Role enforcement is implemented as a middleware (`requireRole`) that checks a numeric role hierarchy: `viewer (1) < analyst (2) < admin (3)`. Any role at or above the required level is permitted.

---

## Project Structure

```
finance-backend/
├── src/
│   ├── db/
│   │   ├── index.js          # PostgreSQL connection pool
│   │   └── migrate.js        # Schema creation (run once)
│   ├── middleware/
│   │   ├── auth.js           # JWT verification, attaches req.user
│   │   └── roleGuard.js      # Role-level access control
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/register|login
│   │   ├── users.js          # Admin user management
│   │   ├── records.js        # Financial records CRUD
│   │   └── dashboard.js      # Aggregation & analytics
│   ├── services/
│   │   ├── authService.js    # Register/login business logic
│   │   ├── userService.js    # User CRUD
│   │   ├── recordsService.js # Records CRUD + filters
│   │   └── dashboardService.js # SQL aggregations
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── recordsValidator.js
│   │   └── validate.js       # Shared validation result handler
│   ├── swagger/
│   │   └── swagger.js        # Swagger spec config
│   └── app.js                # Express setup + entry point
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd finance-backend
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# The defaults in .env already match docker-compose.yml — no edits needed for local dev
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
npm run migrate
```

This creates the `users` and `financial_records` tables, indexes, and triggers.

### 5. Start the server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Server runs at **http://localhost:3000**
Swagger UI at **http://localhost:3000/api-docs**

---

## API Overview

### Auth

| Method | Endpoint              | Access  | Description        |
|--------|-----------------------|---------|--------------------|
| POST   | /api/auth/register    | Public  | Register a user    |
| POST   | /api/auth/login       | Public  | Login, get JWT     |

### Users (admin only)

| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | /api/users                | List all users         |
| GET    | /api/users/:id            | Get user by ID         |
| PATCH  | /api/users/:id/role       | Change a user's role   |
| PATCH  | /api/users/:id/status     | Activate / deactivate  |

### Financial Records

| Method | Endpoint          | Min Role | Description                     |
|--------|-------------------|----------|---------------------------------|
| GET    | /api/records      | analyst  | List records (with filters)     |
| GET    | /api/records/:id  | analyst  | Get one record                  |
| POST   | /api/records      | admin    | Create a record                 |
| PATCH  | /api/records/:id  | admin    | Update a record                 |
| DELETE | /api/records/:id  | admin    | Soft-delete a record            |

**Filter query params for GET /api/records:**
- `type` — `income` or `expense`
- `category` — partial match (case-insensitive)
- `dateFrom` / `dateTo` — ISO 8601 dates
- `page` / `limit` — pagination

### Dashboard (analyst + admin)

| Method | Endpoint                        | Description                   |
|--------|---------------------------------|-------------------------------|
| GET    | /api/dashboard/summary          | Total income, expenses, net   |
| GET    | /api/dashboard/categories       | Totals grouped by category    |
| GET    | /api/dashboard/trends/monthly   | Last 12 months trend          |
| GET    | /api/dashboard/trends/weekly    | Last 12 weeks trend           |
| GET    | /api/dashboard/recent           | Recent activity feed          |

---

## Authentication

All protected routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain the token from `POST /api/auth/login`.

---

## Error Responses

All errors follow a consistent format:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning                              |
|--------|--------------------------------------|
| 400    | Bad request / no fields to update    |
| 401    | Missing, expired, or invalid token   |
| 403    | Insufficient role or deactivated     |
| 404    | Resource not found                   |
| 409    | Conflict (e.g. duplicate email)      |
| 422    | Validation errors (array of errors)  |
| 429    | Rate limit exceeded                  |
| 500    | Internal server error                |

---

## Assumptions and Design Decisions

1. **No ORM** — Raw SQL via `pg` was chosen intentionally to demonstrate direct database knowledge rather than relying on abstraction layers.

2. **Soft deletes** — Records are never physically removed. A `deleted_at` timestamp is set instead. This preserves audit history and is standard practice in financial systems.

3. **Role hierarchy** — Rather than a flat permission list, roles are assigned a numeric level. This keeps the guard logic simple and easy to extend.

4. **Password hashing** — bcrypt with a cost factor of 12, which is the current recommended minimum for production.

5. **Fresh user fetch on every request** — The auth middleware re-queries the database on each request rather than trusting the JWT payload alone. This ensures deactivated users are blocked immediately without waiting for their token to expire.

6. **Viewer dashboard access** — Viewers can access dashboard summary endpoints but cannot see raw records. This matches a typical finance dashboard where executives get high-level summaries without raw transaction access.

7. **Rate limiting** — 100 requests per 15 minutes per IP. Applied globally; can be tightened per-route in production.

---

## Stopping the database

```bash
docker compose down        # stop containers, keep data
docker compose down -v     # stop containers and delete data
```
