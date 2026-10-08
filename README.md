# Entera.ai — Enterprise AI Application Builder Platform

Entera.ai is an enterprise-grade AI application builder platform enabling organizations to design, configure, preview, publish, and deploy modular software solutions with full database schema generation, automated REST APIs, and multi-tenant isolation.

---

## 1. Project Overview & Architecture

Entera.ai is architected with a decoupled frontend and backend connected to an ACID-compliant PostgreSQL relational database.

```
                      ┌────────────────────────────────────────┐
                      │          Client Browser / UI           │
                      │  (React 19 + Vite + TailwindCSS + SPA) │
                      └───────────────────┬────────────────────┘
                                          │
                            HTTPS / REST API (JSON)
                                          │
                      ┌───────────────────▼────────────────────┐
                      │         Entera Backend Server          │
                      │     (Node.js / Express 5 API Layer)    │
                      │   - Authentication & Role Gateways     │
                      │   - Multi-Tenant Isolation Guards      │
                      │   - Dynamic Schema & API Engine        │
                      │   - Immutable Release Snapshots        │
                      │   - Production Logging & Health Check  │
                      └───────────────────┬────────────────────┘
                                          │
                               SQL (pg pool, SSL ready)
                                          │
                      ┌───────────────────▼────────────────────┐
                      │          PostgreSQL Database           │
                      │   - Organizations, Users, Applications │
                      │   - Modules, Pages, Schemas, APIs      │
                      │   - Deployments, Students, Entities    │
                      │   - idx_one_active_app_per_org Index   │
                      └────────────────────────────────────────┘
```

### Key Highlights
- **Multi-Tenant Architecture**: Strict organizational isolation. Users, designers, and administrators can only access resources belonging to their organization.
- **One Organization = One Application Rule**: Strictly enforced at both the application logic level (HTTP 409 Conflict) and the database schema level (`idx_one_active_app_per_org` partial unique index).
- **Immutable Release Snapshots**: When an application is published, a configuration snapshot (`published_config`) is stored in PostgreSQL. Draft designer modifications never break running published applications.
- **Dynamic Application Runtime**: Generated applications execute against real PostgreSQL tables with full CRUD capabilities.

---

## 2. Prerequisites

- **Node.js**: `v20.x` or `v22.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL**: `v14.x`, `v15.x`, or `v16.x` running on port `5432`

---

## 3. Environment Variables Configuration

All sensitive configuration parameters are managed via environment variables. **Never commit real credentials or secrets to version control.**

### Backend Environment Variables (`server/.env`)

Refer to `server/.env.example` for the template:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the backend server | `5000` |
| `NODE_ENV` | Environment mode (`production` or `development`) | `production` |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://postgres:password@localhost:5432/entera` |
| `POSTGRES_USER` | Fallback PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | Fallback PostgreSQL password | `<strong_password>` |
| `POSTGRES_HOST` | Fallback PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | Fallback PostgreSQL port | `5432` |
| `POSTGRES_DB` | Fallback PostgreSQL database name | `entera` |
| `DATABASE_SSL` | Enable SSL for managed cloud databases (AWS RDS, Supabase, Neon) | `false` or `true` |
| `JWT_SECRET` | Secret key for signing authentication tokens | `<random_64_char_secret>` |
| `SESSION_SECRET` | Secret key for session signing | `<random_64_char_secret>` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins (No `*` in prod) | `http://localhost:5173,http://localhost:4173` |
| `FRONTEND_URL` | Production URL of the frontend application | `http://localhost:5173` |
| `INITIAL_ADMIN_EMAIL` | Default SysAdmin email for fresh databases | `admin@gmail.com` |
| `INITIAL_ADMIN_PASSWORD` | Default SysAdmin password for initial boot | `<strong_password>` |

### Frontend Environment Variables (`.env`)

Refer to `.env.example` for the template:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API base URL. Leave empty if served on same host/reverse proxy. | `http://localhost:5000` or empty |

---

## 4. Database Setup & Migrations

Entera includes a zero-downtime, idempotent schema migration engine. It automatically verifies all required production tables, constraints, foreign keys, and default seeds without destroying existing data.

### Running Migrations

```bash
# Run migration from project root
npm run db:migrate

# Or directly in server directory
cd server
npm run migrate
```

### Core Database Tables
1. `organizations`: Tenant companies and account status.
2. `users`: Multi-role users (`sys_admin`, `org_admin`, `designer`).
3. `applications`: Enterprise applications scoped to organizations.
4. `templates`: Pre-seeded industry templates.
5. `modules`: System and business modules.
6. `application_modules`: Modules assigned to specific applications.
7. `database_schemas`: Dynamic schema configurations (`JSONB`).
8. `apis`: REST API definitions and route specifications (`JSONB`).
9. `deployments`: Deployment lifecycle records and immutable configuration snapshots.
10. `students`: Primary entity table for the Student Management System.
11. `application_pages`: Builder page layouts and UI component trees (`JSONB`).
12. `application_navigation`: Navigation bar and branding configurations (`JSONB`).
13. `application_entities`: Generalized dynamic entity store (`JSONB`).
14. `designer_applications`: Many-to-many designer assignments.

---

## 5. Startup Commands

### Step 1: Initialize Database
```bash
npm run db:migrate
```

### Step 2: Build Frontend for Production
```bash
npm run build
```

### Step 3: Start Production Backend
```bash
npm start
# or: npm run server:prod
```

The Express server serves:
- REST API at `/api/*`
- Backend health check at `/health` and `/api/health`
- Precompiled frontend SPA assets from `/dist`

### Running in Development Mode
```bash
npm run dev
```
(Concurrently starts Express backend on port `5000` and Vite dev server on port `5173`).

---

## 6. Health Check Endpoint

Entera includes an automated production health check endpoint:

```http
GET /health
```

**Response (HTTP 200 OK):**
```json
{
  "status": "UP",
  "timestamp": "2026-10-07T06:15:14.652Z",
  "services": {
    "backend": "healthy",
    "database": "connected"
  }
}
```

If PostgreSQL connectivity fails, the endpoint returns `HTTP 503 Service Unavailable`:
```json
{
  "status": "DOWN",
  "timestamp": "2026-10-07T06:15:14.652Z",
  "services": {
    "backend": "healthy",
    "database": "disconnected"
  },
  "error": "Database unavailable"
}
```
*Note: Sensitive database connection strings and passwords are never exposed in health output.*

---

## 7. Default Roles & Access Control

| Role | Access Level | Description |
| :--- | :--- | :--- |
| `sys_admin` | Platform Wide | Manages all organizations, platform metrics, audits, and system administrators. |
| `org_admin` | Organization Scoped | Creates the organization's single application, invites designers, manages deployments, and updates company profile. |
| `designer` | Application Scoped | Designs pages, configures modules, modifies database schema, generates REST APIs, and runs previews. |
| `runtime_user` | Application Scoped | Interacts with published application runtime data (e.g., student directory CRUD). |

---

## 8. Security Hardening

1. **Password Security**: Passwords are encrypted using salted `bcryptjs` hashing (10 rounds). Raw passwords are never stored or returned in API responses.
2. **SQL Injection Protection**: All PostgreSQL queries use parameterized queries (`$1`, `$2`, ...).
3. **Strict CORS Policy**: Production server forbids wildcard `*` origins and only permits explicitly allowed origins configured in `CORS_ORIGIN`.
4. **Tenant Isolation**: Backend middleware validates `user -> organization -> application` boundaries on every protected request. Header spoofing is strictly prevented.
5. **No Secret Leaks**: Request logging filters out credentials, tokens, and payloads.

---

## 9. Verification & Testing

Entera includes a comprehensive automated end-to-end regression test suite verifying all 17 production requirements:

```bash
# Run comprehensive production readiness test (103 checks)
node test_production_readiness_e2e.cjs

# Run preview & runtime workflow test
node test_preview_and_runtime_workflow.cjs

# Run publishing & deployment test
node test_publish_and_deployment_workflow.cjs

# Run system administrator test
node test_sysadmin_e2e.cjs

# Run organization administrator test
node test_org_admin_e2e.cjs
```
