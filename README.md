# Finance Dashboard Backend

A RESTful backend API for a role-based finance dashboard system, built with **Node.js**, **Express**, and **PostgreSQL**. Includes a lightweight HTML/CSS/JS frontend for demonstration.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js + Express | Lightweight, fast to iterate, widely used in production |
| Database | PostgreSQL (via Docker) | Production-grade relational DB, strong for financial data |
| Auth | JWT (jsonwebtoken) | Stateless, standard for REST APIs |
| Validation | express-validator | Declarative, composable input validation |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) | Auto-generated, interactive docs |
| Password | bcryptjs | Industry-standard hashing (cost factor 12) |
| Tests | Jest + Supertest | Integration-level API tests |

---

## Role Model

| Role | Records (read) | Records (write) | Dashboard | Users | Export CSV |
|------|:-:|:-:|:-:|:-:|:-:|
| viewer (1) | ✗ | ✗ | ✓ | ✗ | ✗ |
| analyst (2) | ✓ | ✗ | ✓ | ✗ | ✓ |
| admin (3) | ✓ | ✓ | ✓ | ✓ | ✓ |

Role enforcement is handled by a `requireRole(minLevel)` middleware that checks a numeric role hierarchy. Any role at or above the required level is permitted.

---

## Project Structure

```
finance-dashboard-system/
├── src/
│   ├── db/
│   │   ├── index.js            # PostgreSQL connection pool
│   │   ├── migrate.js          # Schema creation (run once)
│   │   └── seed.js             # Sample data seeder
│   ├── middleware/
│   │   ├── auth.js             # JWT verification → req.user
│   │   └── roleGuard.js        # Role-level access control
│   ├── routes/
│   │   ├── auth.js             # POST /api/auth/register|login
│   │   ├── users.js            # Admin user management
│   │   ├── records.js          # Financial records CRUD + export
│   │   └── dashboard.js        # Aggregation & analytics
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── recordsService.js   # CRUD + search + CSV export
│   │   └── dashboardService.js # SQL aggregations
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── recordsValidator.js
│   │   └── validate.js
│   ├── swagger/
│   │   └── swagger.js
│   └── app.js                  # Express setup + entry point
├── frontend/
│   ├── login.html
│   ├── dashboard.html
│   ├── records.html
│   ├── users.html
│   ├── dashboard.css           # All styles (dark theme)
│   ├── app.js                  # Shared: API helper, auth, utils
│   ├── login.js
│   ├── dashboard.js            # Charts, KPIs, recent activity
│   └── records.js              # Search, filter, CRUD, CSV export
├── tests/
│   └── api.test.js             # Jest + Supertest integration tests
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
git clone https://github.com/prasanna-0806/finance-dashboard-system
cd finance-dashboard-system
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Defaults already match docker-compose.yml — no edits needed for local dev
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run migrations

```bash
npm run migrate
```

### 5. Seed sample data *(optional but recommended)*

```bash
npm run seed
```

This creates 3 demo users and ~50 realistic financial records so the dashboard looks populated immediately.

| Email | Password | Role |
|-------|----------|------|
| admin@finance.dev | Admin@1234 | admin |
| analyst@finance.dev | Analyst@1234 | analyst |
| viewer@finance.dev | Viewer@1234 | viewer |

### 6. Start the server

```bash
npm run dev    # development (auto-restart)
npm start      # production
```

- API: **http://localhost:3000**
- Swagger UI: **http://localhost:3000/api-docs**
- Frontend: open `frontend/login.html` in your browser

---

## API Reference

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/register | Public | Register a new user |
| POST | /api/auth/login | Public | Login, receive JWT |

### Users *(admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| GET | /api/users/:id | Get user by ID |
| PATCH | /api/users/:id/role | Change a user's role |
| PATCH | /api/users/:id/status | Activate / deactivate |

### Financial Records

| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | /api/records | analyst | List with filters + search + pagination |
| GET | /api/records/export | analyst | Download filtered records as CSV |
| GET | /api/records/:id | analyst | Get single record |
| POST | /api/records | admin | Create a record |
| PATCH | /api/records/:id | admin | Update a record |
| DELETE | /api/records/:id | admin | Soft-delete |

**Filter / search params for `GET /api/records`:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search across `notes`, `category`, `description` |
| `type` | `income` \| `expense` | Filter by type |
| `category` | string | Partial match (case-insensitive) |
| `dateFrom` | ISO 8601 date | Records on or after this date |
| `dateTo` | ISO 8601 date | Records on or before this date |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20, max: 100) |

All params work on `/api/records/export` too.

### Dashboard *(analyst + admin)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/summary | Total income, expenses, net balance |
| GET | /api/dashboard/categories | Totals grouped by category |
| GET | /api/dashboard/trends/monthly | Last 12 months income vs expense |
| GET | /api/dashboard/trends/weekly | Last 12 weeks income vs expense |
| GET | /api/dashboard/recent | Recent activity feed |

---

## Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <token>
```

Obtain the token from `POST /api/auth/login`.

---

## Running Tests

```bash
# Requires the server to be running and seed data to be present
npm run seed
npm test
```

Tests cover: auth (login, validation, wrong credentials), role-based access control, search behaviour, full CRUD lifecycle, input validation, dashboard access, and CSV export.

---

## Error Response Format

All errors follow a consistent shape:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / no fields to update |
| 401 | Missing, expired, or invalid token |
| 403 | Insufficient role or deactivated account |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Validation errors (array) |
| 429 | Rate limit exceeded (100 req / 15 min) |
| 500 | Internal server error |

---

## Assumptions & Design Decisions

1. **No ORM** — Raw SQL via `pg` was chosen intentionally to demonstrate direct database knowledge and control over query behaviour.

2. **Soft deletes** — Records are never physically removed; a `deleted_at` timestamp is set instead. This preserves audit history, which is standard practice in financial systems.

3. **Role hierarchy** — Roles are assigned a numeric level (`viewer=1`, `analyst=2`, `admin=3`). Guards use `>= minLevel`, keeping access control logic simple and easy to extend.

4. **Fresh DB fetch on every request** — The auth middleware re-queries the database on each request rather than trusting the JWT payload alone. This ensures deactivated users are blocked immediately without waiting for token expiry.

5. **Viewer dashboard access** — Viewers can access dashboard summary endpoints but cannot see raw records, matching a real-world pattern where executives receive high-level summaries without raw transaction access.

6. **Search implementation** — `ILIKE` on `notes`, `category`, and `description` fields. Chosen for simplicity; a full-text index (`tsvector`) would be the production upgrade path for large datasets.

7. **CSV export** — Streaming a SQL query directly to a CSV response. No temp files, no memory accumulation. The same filter params from `GET /api/records` apply.

8. **Rate limiting** — 100 requests per 15 minutes per IP, applied globally. Can be tightened per-route in production.

---

## Stopping the database

```bash
docker compose down       # stop containers, keep data
docker compose down -v    # stop containers and wipe data
```
