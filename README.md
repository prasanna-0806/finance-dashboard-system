# FinanceOS — Finance Data Processing and Access Control Backend

A backend system for a finance dashboard with role-based access control, financial records management, and analytics APIs. Built with Node.js, Express, and PostgreSQL.

---

## Live Demo

| | URL |
|---|---|
| **Demo with Frontend** | https://finance-dashboard-system-5noe.onrender.com/html/login.html |
| **API Docs (Swagger)** | https://finance-dashboard-system-5noe.onrender.com/api-docs |

> ⚠️ Hosted on Render free tier — first request may take 30–50 seconds to wake up.

**Demo credentials:**

| Email | Password | Role |
|---|---|---|
| admin@finance.dev | Admin@1234 | Admin |
| analyst@finance.dev | Analyst@1234 | Analyst |
| viewer@finance.dev | Viewer@1234 | Viewer |

>New accounts can be registered via the Register tab on the login page or through the POST /api/auth/register endpoint. By default, all new users are assigned the viewer role. Admin users (e.g., admin@finance.dev) can upgrade other users to analyst or admin roles. Any user promoted to admin gains the same privileges and can manage roles for other users.
 
---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon — serverless, production)
- **Auth**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **API Docs**: Swagger UI (`/api-docs`)
- **Rate Limiting**: express-rate-limit
- **Tests**: Jest + Supertest (`src/tests/`)

---

## Project Structure

```
finance-backend/
├── public/
│   ├── html/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── records.html
│   │   ├── insights.html
│   │   └── users.html
│   ├── css/
│   │   └── dashboard.css       # All styles (dark theme)
│   └── js/
│       ├── app.js              # Shared: API helper, auth, utils
│       ├── login.js
│       ├── dashboard.js        # Charts, KPIs, recent activity
│       ├── records.js          # Search, filter, CRUD, CSV export
│       ├── insights.js
│       └── users.js
├── src/
│   ├── tests/
│   │   └── api.test.js         # Jest + Supertest integration tests
│   ├── app.js                  # Express app entry point
│   ├── db/
│   │   ├── index.js        # PostgreSQL pool
│   │   ├── migrate.js      # Schema creation
│   │   └── seed.js         # Demo users + sample records
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication middleware
│   │   └── roleGuard.js    # Role-based access control middleware
│   ├── routes/
│   │   ├── auth.js         # /api/auth
│   │   ├── users.js        # /api/users
│   │   ├── records.js      # /api/records
│   │   └── dashboard.js    # /api/dashboard
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── recordsService.js
│   │   └── dashboardService.js
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── recordsValidator.js
│   │   └── validate.js
│   └── swagger/
│       └── swagger.js
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Setup (Local)

### Prerequisites

- Node.js v18+
- PostgreSQL (local install or Docker)

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=finance_user
DB_PASSWORD=finance_pass
DB_NAME=finance_db

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

### 3. Start PostgreSQL

**Option A — Docker (recommended):**
```bash
docker-compose up -d
```

**Option B — Local PostgreSQL:**
Create the database and user manually to match your `.env` values.

### 4. Run migrations

```bash
npm run migrate
```

Creates the `users` and `financial_records` tables with indexes and triggers.

### 5. Seed demo data

```bash
npm run seed
```

Creates 3 demo users (one per role) and sample financial records.

### 6. Start the server

```bash
npm start
```

- **API:** http://localhost:3000
- **Swagger UI:** http://localhost:3000/api-docs
- **Frontend:** http://localhost:3000/html/login.html

For development with auto-reload, use `npm run dev`.

> **Note:** If running locally, update `public/js/app.js` line 1 to `const API = 'http://localhost:3000'`

---

## Quick Start (2 minutes)

```
npm install
cp .env.example .env
docker-compose up -d
npm run migrate
npm run seed
npm start
```

---

## Role Permissions

| Feature | Viewer | Analyst | Admin |
|---|:---:|:---:|:---:|
| View dashboard & KPIs | ✓ | ✓ | ✓ |
| View records | ✗ | ✓ | ✓ |
| View insights & trends | ✗ | ✓ | ✓ |
| Export records as CSV | ✗ | ✓ | ✓ |
| Create / edit / delete records | ✗ | ✗ | ✓ |
| Manage users (roles, status) | ✗ | ✗ | ✓ |

Role hierarchy is enforced at the backend middleware level — not just the UI. Every API route checks the authenticated user's role before processing the request. **Admins have every analyst capability** (view records, insights, and **CSV export**), plus user management and record create/update/delete.

---

## Running Tests

```bash
npm test
```

PostgreSQL must be running with schema migrated and demo users present (`npm run migrate` and `npm run seed`). Integration tests live in **`src/tests/api.test.js`** (Jest + Supertest).

---

## API Reference

Full interactive documentation is available at **https://finance-dashboard-system-5noe.onrender.com/api-docs** (Swagger UI).

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive a JWT |

### Records

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/records` | Analyst+ | List records with filters and pagination |
| GET | `/api/records/:id` | Analyst+ | Get a single record |
| POST | `/api/records` | Admin | Create a new record |
| PATCH | `/api/records/:id` | Admin | Update a record |
| DELETE | `/api/records/:id` | Admin | Soft-delete a record |
| GET | `/api/records/export` | Analyst+ | Export filtered records as CSV |

*Analyst+ means analyst **or** admin.*

**Supported filters for GET /api/records:**

| Param | Type | Description |
|---|---|---|
| `type` | `income` \| `expense` | Filter by type |
| `category` | string | Filter by category (partial match) |
| `dateFrom` | YYYY-MM-DD | Records on or after this date |
| `dateTo` | YYYY-MM-DD | Records on or before this date |
| `search` | string | Search notes and category |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Records per page (default: 15, max: 100) |

### Dashboard

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Viewer+ | Total income, expenses, net balance |
| GET | `/api/dashboard/categories` | Viewer+ | Totals grouped by category and type |
| GET | `/api/dashboard/trends/monthly` | Viewer+ | Income vs expenses for last 12 months |
| GET | `/api/dashboard/trends/weekly` | Viewer+ | Income vs expenses for last 12 weeks |
| GET | `/api/dashboard/recent` | Viewer+ | Most recent financial activity |

### Users (Admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all users (paginated) |
| GET | `/api/users/:id` | Get a user by ID |
| PATCH | `/api/users/:id/role` | Update a user's role |
| PATCH | `/api/users/:id/status` | Activate or deactivate a user |

---

## Access Control Implementation

Authentication and authorization are handled by two middleware functions applied to every protected route:

**`authenticate`** (`src/middleware/auth.js`)
- Verifies the JWT from the `Authorization: Bearer <token>` header
- Fetches fresh user data from the database on every request — so deactivated accounts are blocked immediately even if their token is still valid
- Returns `401` if the token is missing, invalid, or expired
- Returns `403` if the account is deactivated

**`requireRole`** (`src/middleware/roleGuard.js`)
- Enforces a minimum role level using a numeric hierarchy: `viewer=1`, `analyst=2`, `admin=3`
- Returns `403` with a clear error message if the user's role is insufficient

Example usage in a route:
```js
router.post('/', authenticate, requireRole('admin'), ...)   // admin only
router.get('/',  authenticate, requireRole('analyst'), ...) // analyst and above
router.get('/',  authenticate, requireRole('viewer'), ...)  // all authenticated users
```

---

## Validation and Error Handling

All inputs are validated using `express-validator` before reaching any service logic.

**Auth validation:**
- `name` — required, non-empty
- `email` — must be a valid email, normalised before storage
- `password` — minimum 6 characters
- `role` — optional, must be one of `admin`, `analyst`, `viewer`

**Record validation:**
- `amount` — required, must be a positive number (`> 0`)
- `type` — required, must be `income` or `expense`
- `category` — required, non-empty string
- `date` — required, must be a valid ISO 8601 date (`YYYY-MM-DD`)
- `notes` — optional string
- `id` params — must be valid UUIDs

**Error responses:**
- `400` — bad request
- `401` — missing/invalid/expired token
- `403` — insufficient role or deactivated account
- `404` — resource not found
- `409` — conflict (e.g. email already in use)
- `422` — validation failed (returns array of field-level error messages)
- `429` — rate limit exceeded (100 requests per 15 minutes per IP)
- `500` — internal server error (details logged server-side only)

---

## Data Model

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `name` | VARCHAR(100) | Required |
| `email` | VARCHAR(255) | Unique |
| `password` | TEXT | bcrypt hashed (12 rounds) |
| `role` | ENUM | `viewer`, `analyst`, `admin` |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `financial_records`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `amount` | NUMERIC(15,2) | Must be `> 0`, enforced at DB level |
| `type` | ENUM | `income` or `expense` |
| `category` | VARCHAR(100) | Required |
| `date` | DATE | Required |
| `notes` | TEXT | Optional |
| `created_by` | UUID | Foreign key → `users.id` |
| `deleted_at` | TIMESTAMPTZ | `NULL` = active, set = soft-deleted |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

Indexes are created on `type`, `category`, and `date` (filtered to non-deleted rows) for efficient dashboard queries.

---

## Optional Enhancements Implemented

- **JWT Authentication** — stateless auth with configurable expiry
- **Soft Delete** — records are never permanently removed; `deleted_at` is set instead
- **Pagination** — all list endpoints support `page` and `limit` params
- **Search** — full-text search across `notes` and `category` fields
- **CSV Export** — analysts and admins can export filtered records (`GET /api/records/export`)
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **Swagger API Docs** — interactive docs at `/api-docs`
- **Frontend** — fully functional multi-page dashboard served as static files

---

## Assumptions and Tradeoffs

- **Notes vs Description**: The assignment mentions "notes or description" as a record field. These were consolidated into a single `notes` field to keep the schema clean and avoid redundancy.

- **Role assignment on register**: The register endpoint accepts an optional `role` field. In a production system this would be admin-only. For this assessment it is left open to make testing all three roles easier without needing admin intervention.

- **Fresh DB lookup on every request**: The `authenticate` middleware re-fetches the user from the database on every protected request instead of trusting the JWT payload alone. This ensures deactivated accounts are blocked immediately rather than waiting for the token to expire. The tradeoff is one extra DB query per request.

- **In-memory rate limiting**: The rate limiter uses in-memory storage, so limits reset if the server restarts. A production system would use Redis for this.
