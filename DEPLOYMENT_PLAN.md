# Entera.ai — Production Deployment Plan

This document outlines the comprehensive architecture, environment specifications, service configurations, and step-by-step checklist for deploying **Entera.ai** to production using **Vercel** (Frontend), **Render** (Backend), **Supabase** (PostgreSQL Database), and **GitHub** (Source Control).

---

## 1. Project Architecture Summary

```
                       ┌───────────────────────────────────────────────┐
                       │                   CLIENT                      │
                       │               Web Browser                     │
                       └───────────────────────┬───────────────────────┘
                                               │
                                               │ HTTPS
                                               ▼
                       ┌───────────────────────────────────────────────┐
                       │               VERCEL (Frontend)               │
                       │        React 19 + Vite 8 SPA (Static)         │
                       │             https://<app>.vercel.app          │
                       │                                               │
                       │  - SPA Routing: /index.html rewrite           │
                       │  - Reverse Proxy: /api/* -> Render Backend   │
                       └───────────────────────┬───────────────────────┘
                                               │
                                               │ HTTPS (Proxied REST API)
                                               ▼
                       ┌───────────────────────────────────────────────┐
                       │               RENDER (Backend)                │
                       │          Node.js Express 5 REST API           │
                       │         https://<backend>.onrender.com        │
                       │                                               │
                       │  - Port: process.env.PORT (Auto-injected)     │
                       │  - Health Check: /health or /api/health       │
                       │  - CORS: Configured for Vercel Origin         │
                       └───────────────────────┬───────────────────────┘
                                               │
                                               │ PostgreSQL SSL (Port 5432)
                                               ▼
                       ┌───────────────────────────────────────────────┐
                       │             SUPABASE (Database)               │
                       │            Managed PostgreSQL 15+             │
                       │         db.<project-ref>.supabase.co          │
                       │                                               │
                       │  - 15 Core Tables & Multi-tenant Schema       │
                       │  - Seed Data & System Administrator Account   │
                       └───────────────────────────────────────────────┘
```

| Component | Technology | Target Host | Deployment Type |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19, React Router v7, Vite v8, TailwindCSS v3 | **Vercel** | Static Web Application (SPA) |
| **Backend** | Node.js (v20+), Express v5, `pg` (v8.23), `bcryptjs` | **Render** | Docker / Node.js Web Service |
| **Database** | PostgreSQL 15+ | **Supabase** | Cloud Managed PostgreSQL (SSL) |
| **Repository** | Git, GitHub | **GitHub** | `snehaMS-2003/EnteraAI` (`main` branch) |

---

## 2. Directory Layout & Key File Locations

```
Entera_Project/
├── package.json              <-- Root package manifest (Vite frontend scripts & dev dependencies)
├── vite.config.js            <-- Vite configuration & local dev proxy setup
├── index.html                <-- Frontend entry HTML template
├── src/                      <-- Frontend React source code
│   ├── App.jsx               <-- BrowserRouter routing definitions
│   ├── main.jsx              <-- React DOM client entry
│   ├── contexts/             <-- AuthContext, ApplicationContext
│   ├── hooks/useAuth.js      <-- orgFetch API client wrapper with multi-tenant headers
│   ├── utils/api.js          <-- buildApiUrl helper resolving VITE_API_URL
│   └── pages/                <-- Landing, Auth, Dashboards, Runtime views
├── server/                   <-- Backend Node.js Express application
│   ├── package.json          <-- Backend dependencies (express, pg, nodemailer, etc.)
│   ├── index.js              <-- Backend entry point (REST routes, CORS, health check)
│   ├── db.js                 <-- PostgreSQL connection pool (pg.Pool) & schema definitions
│   ├── migrate.js            <-- Idempotent schema migration & verification script
│   ├── email.js              <-- Nodemailer transactional email delivery service
│   └── .env.example          <-- Backend template environment variables
├── test_*.py                 <-- Automated Selenium Pytest verification suites (TC_001 to TC_005)
├── screenshots/              <-- Visual evidence artifacts
└── .gitignore                <-- Git exclusions (ignores .env, caches, node_modules, dist)
```

---

## 3. Build, Start & Execution Commands

### Frontend (Vercel)
- **Root Directory:** `./` (Project root)
- **Framework Preset:** `Vite`
- **Install Command:** `npm install`
- **Build Command:** `npm run build` (runs `vite build`)
- **Output Directory:** `dist`
- **Local Verification:** Verified clean build with 0 errors (`built in 23.73s`, output in `dist/`).

### Backend (Render)
- **Root Directory:** `server` *(Recommended)* OR `./` (Project root)
  - *If Root Directory is `server`:*
    - **Build Command:** `npm install`
    - **Start Command:** `node index.js`
  - *If Root Directory is `./`:*
    - **Build Command:** `cd server && npm install`
    - **Start Command:** `node server/index.js`
- **Health Check Path:** `/health` or `/api/health`
- **Port:** Render automatically sets `PORT=10000` (Handled by `const PORT = process.env.PORT || 5000;`).

### Database Migration (Supabase)
- **Migration Command:** `node server/migrate.js` (or `npm run db:migrate`)
- Can be run from a local terminal against the Supabase `DATABASE_URL` once, or configured as a Render **Pre-Deploy Command**: `node server/migrate.js`.

---

## 4. Required Environment Variables (Names Only)

> [!IMPORTANT]
> **Zero-Secrets Policy:** Do not commit secret values to GitHub. All sensitive credentials must be set exclusively in the respective hosting provider's dashboard settings.

### Backend Environment Variables (Render Dashboard)

| Variable Name | Required? | Purpose / Description |
| :--- | :---: | :--- |
| `NODE_ENV` | **Yes** | Set to `production`. |
| `PORT` | Auto | Injected automatically by Render (e.g. `10000`). |
| `DATABASE_URL` | **Yes** | Full PostgreSQL connection string provided by Supabase. |
| `DATABASE_SSL` | **Yes** | Set to `true` (enables `rejectUnauthorized: false` in `server/db.js`). |
| `FRONTEND_URL` | **Yes** | Production URL of Vercel frontend (e.g. `https://your-project.vercel.app`). |
| `CORS_ORIGIN` | **Yes** | Allowed origin for browser requests (matches `FRONTEND_URL`). |
| `ALLOWED_ORIGINS` | Optional | Alternate comma-separated origins if multiple domains are used. |
| `INITIAL_ADMIN_EMAIL` | Optional | Initial sysadmin login email (defaults to `admin@gmail.com`). |
| `INITIAL_ADMIN_PASSWORD` | Optional | Initial sysadmin password on first migration seed. |
| `SMTP_HOST` | Optional | Outbound SMTP server hostname for password reset emails. |
| `SMTP_PORT` | Optional | SMTP port (e.g. `587` or `465`). |
| `SMTP_USER` | Optional | SMTP authentication username. |
| `SMTP_PASSWORD` | Optional | SMTP authentication password. |
| `SMTP_FROM` | Optional | Sender display email header (e.g. `Entera.ai Security <no-reply@entera.ai>`). |
| `SMTP_SECURE` | Optional | `true` for SSL port 465, `false` for TLS port 587. |

### Frontend Environment Variables (Vercel Dashboard)

| Variable Name | Required? | Purpose / Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | Optional* | Full base URL of the Render backend (`https://<backend>.onrender.com`). *(Optional if using `vercel.json` API rewrite proxy).* |
| `VITE_API_BASE_URL` | Optional* | Alternative alias for `VITE_API_URL`. |

*\*Recommendation:* Using a `vercel.json` rewrite proxy allows the frontend to continue calling `/api/...` on the same domain, eliminating cross-origin browser issues entirely.

---

## 5. PostgreSQL Migration & Backup Requirements (Supabase)

### 15 Core Application Tables
The schema is managed by [server/migrate.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/migrate.js) and [server/db.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/db.js):
1. `organizations` — Multi-tenant organization accounts, profiles, and admin credentials.
2. `users` — User profiles, bcrypt password hashes, and roles (`sys_admin`, `org_admin`, `app_admin`, `designer`, `user`).
3. `applications` — Multi-tenant application metadata, status (`draft`, `published`, `archived`), and configuration.
4. `templates` — Built-in application industry templates (CRM, Student Management, HRMS, Inventory).
5. `modules` — Feature modules (Auth, Schema, APIs, Deployment, etc.).
6. `application_modules` — Junction table enabling specific modules per application.
7. `database_schemas` — Dynamic entity definitions and column specifications.
8. `apis` — REST endpoint routing configurations per application.
9. `deployments` — Deployment versioning, environments (`production`, `staging`), and audit logs.
10. `students` — Sample runtime entity demonstrating schema execution and data records.
11. `application_pages` — Dynamic page layout configurations and component JSON trees.
12. `application_navigation` — Dynamic sidebar and header navigation items for runtime apps.
13. `application_entities` — Custom entity schema registry.
14. `designer_applications` — Access mapping between designers/users and assigned applications.
15. `password_reset_tokens` — Secure SHA-256 password reset tokens with 1-hour expiration and single-use audit flags.

### Supabase Connection Modes:
- **Direct Connection:** `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` (Recommended for database migration scripts).
- **Session Connection Pooler:** `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres` (Recommended for Render web services).
- **SSL Requirement:** Supabase strictly enforces SSL connections. `DATABASE_SSL=true` must be set in Render environment variables.

### Pre-Deployment Database Initialization:
Run the idempotent migration script before traffic routing:
```bash
# Executed with Supabase connection string
DATABASE_URL="<supabase-connection-string>" DATABASE_SSL="true" node server/migrate.js
```

---

## 6. Vercel Configuration Requirements (Frontend)

To prevent HTTP 404 errors on browser page reloads in React Router and to proxy backend API requests, create a `vercel.json` file in the project root:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://<your-render-backend-name>.onrender.com/api/$1"
    },
    {
      "source": "/health",
      "destination": "https://<your-render-backend-name>.onrender.com/health"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Key Benefits of this Configuration:
1. **SPA Direct-Page Refresh:** Routes like `/login`, `/admin/dashboard`, `/user/dashboard` serve `index.html`, allowing React Router to render without 404s.
2. **Seamless Same-Origin API Calls:** Frontend components calling relative URLs (`fetch('/api/...')` or `orgFetch('/api/...')`) are automatically proxied to Render.
3. **Zero CORS Friction:** Browser communicates with `https://your-app.vercel.app` directly; Vercel performs server-to-server proxying to Render.

---

## 7. Render Configuration Requirements (Backend)

In the Render Dashboard:
1. **Service Type:** `Web Service`
2. **Repository:** `snehaMS-2003/EnteraAI`
3. **Branch:** `main`
4. **Root Directory:** `server`
5. **Runtime:** `Node`
6. **Build Command:** `npm install`
7. **Start Command:** `node index.js`
8. **Health Check Path:** `/health`
9. **Auto-Deploy:** `Yes`
10. **Environment Variables:**
    - `NODE_ENV` = `production`
    - `DATABASE_URL` = `<Supabase Connection String>`
    - `DATABASE_SSL` = `true`
    - `CORS_ORIGIN` = `https://<your-vercel-app>.vercel.app`
    - `FRONTEND_URL` = `https://<your-vercel-app>.vercel.app`

---

## 8. Potential Deployment Issues & Recommended Mitigations

| Issue / Risk | Root Cause | Impact | Recommended Fix / Mitigation |
| :--- | :--- | :--- | :--- |
| **Vercel 404 on Page Refresh** | Client-side routing without server rewrites | Navigating directly to `/admin/dashboard` returns 404 on Vercel | Add `vercel.json` with `"source": "/(.*)", "destination": "/index.html"`. |
| **Render Free Tier Cold Starts** | Free Render instances spin down after 15m of inactivity | First API request after inactivity takes ~30–50s to respond | Configure Render health check path (`/health`) and document expected wake-up time. |
| **Supabase SSL Rejection** | Cloud PostgreSQL requires SSL encryption | Backend crashes on startup with `no pg_hba.conf entry for host` or SSL error | Set `DATABASE_SSL=true` in Render environment variables. |
| **Database `CREATE DATABASE` Permission Error** | Managed databases restrict superuser catalog modification | Server attempts `CREATE DATABASE` on startup and fails | `server/db.js` is already wrapped in `try...catch` and will automatically proceed to target database. |
| **Cross-Origin Request Block (CORS)** | Frontend domain not recognized in allowed origins | API calls fail with CORS error in browser console | Configure `CORS_ORIGIN` on Render AND use the `vercel.json` `/api/(.*)` reverse proxy. |
| **Relative vs Absolute Fetch URLs** | Some pages use relative `/api/...` while others use `orgFetch` | Inconsistent endpoint URLs across pages | Vercel `/api/(.*)` proxy handles relative URLs; `VITE_API_URL` handles absolute URLs. |

---

## 9. Git Repository Readiness Assessment

- **Current Branch:** `main`
- **Remote:** `origin` -> `https://github.com/snehaMS-2003/EnteraAI.git`
- **Working Tree:** Completely clean (`nothing to commit, working tree clean`).
- **Commit History:** Fully synced with GitHub (`667d189..73e59c1`).
- **Secret Protection:** `.env`, local configuration files, and temporary caches are strictly excluded by [.gitignore](file:///c:/Users/sneha/Downloads/Entera_Project/.gitignore). No credentials or secrets exist in git history.

---

## 10. Sequential Deployment Checklist (For Step 2)

```
[ ] Phase 1: Database Setup (Supabase)
    1. Create a new project in the Supabase Dashboard.
    2. Retrieve the PostgreSQL Connection String (Transaction Pooler or Direct).
    3. Run `DATABASE_URL="<supabase-url>" DATABASE_SSL="true" node server/migrate.js` to initialize all 15 tables and seed data.
    4. Confirm tables and baseline records in Supabase Table Editor.

[ ] Phase 2: Backend Web Service Deployment (Render)
    1. Sign in to Render and create a new Web Service connected to `snehaMS-2003/EnteraAI`.
    2. Set Root Directory to `server`.
    3. Set Build Command to `npm install` and Start Command to `node index.js`.
    4. Configure Environment Variables: `NODE_ENV`, `DATABASE_URL`, `DATABASE_SSL=true`, `CORS_ORIGIN`, `FRONTEND_URL`.
    5. Set Health Check Path to `/health`.
    6. Deploy and verify service returns status 200 at `https://<backend>.onrender.com/health`.

[ ] Phase 3: Frontend Deployment (Vercel)
    1. Create `vercel.json` in project root with SPA rewrite and `/api/(.*)` proxy destination.
    2. Push `vercel.json` to GitHub `main` branch.
    3. Import repository `snehaMS-2003/EnteraAI` in Vercel.
    4. Set Framework to `Vite`, Root Directory to `./`, Build Command `npm run build`, Output `dist`.
    5. Configure `VITE_API_URL=https://<backend>.onrender.com`.
    6. Deploy and verify landing page at `https://<app>.vercel.app`.

[ ] Phase 4: Production End-to-End Verification
    1. Verify landing page loads and assets render correctly.
    2. Test System Admin login (`admin@gmail.com`).
    3. Test Standard User login (`tom123@gmail.com`).
    4. Test deep route refresh (e.g. `https://<app>.vercel.app/admin/dashboard`).
    5. Test API proxy roundtrip and organization data loading.
```

---

## 11. Confirmed Findings vs. Assumptions

### Confirmed Findings (Verified directly from codebase):
1. **Frontend framework:** React 19 + React Router DOM v7 + Vite 8.
2. **Frontend build output:** Output folder is `dist/` (tested and confirmed via `npm run build` in 23.73s).
3. **Backend framework:** Express 5.x with Node.js CommonJS module format.
4. **Backend entry point:** [server/index.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/index.js).
5. **Database client:** `pg` (`node-postgres` with `Pool`).
6. **SSL compatibility:** Supported via `process.env.DATABASE_SSL === 'true'`.
7. **Database migrations:** Fully self-contained in [server/migrate.js](file:///c:/Users/sneha/Downloads/Entera_Project/server/migrate.js) for all 15 tables.
8. **Health check endpoint:** Active at `/health` and `/api/health`.
9. **Port binding:** Listens on `process.env.PORT || 5000`.
10. **File storage / WebSockets:** None; completely stateless HTTP API storing all state in PostgreSQL.

### Assumptions & External Prerequisites (To be completed in Step 2):
1. User has active accounts on **Supabase**, **Render**, and **Vercel**.
2. Outbound transactional SMTP service is optional (can use mock or leave unconfigured for initial launch).
3. The exact final domain names (`https://*.vercel.app` and `https://*.onrender.com`) will be determined upon service creation.
