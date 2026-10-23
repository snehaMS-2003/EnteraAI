# Entera.ai — PostgreSQL Database Backup Report (Step 3)

**Generated:** 2026-10-23 09:39:12 (Local Time)  
**Status:** COMPLETE & VERIFIED  
**Zero-Secrets Compliance:** Verified — No passwords, credentials, or private connection strings are contained in this document.

---

## 1. Executive Summary

As part of **Step 3** of the Entera.ai deployment process, a full non-destructive backup of the existing local PostgreSQL database (`entera`) was successfully executed using PostgreSQL's custom archive format (`-F c`).

The resulting archive file was thoroughly verified using `pg_restore --list` and an extraction test. All 15 application tables, sequences, data payloads, and relational constraints were confirmed present and uncorrupted.

---

## 2. Backup Metadata & Storage Specifications

| Property | Details |
| :--- | :--- |
| **Database Name** | `entera` |
| **Database Host** | `localhost:5432` |
| **PostgreSQL Engine Version** | PostgreSQL 18.4 (x86_64-windows) |
| **Backup Timestamp** | `20261023_093912` (2026-10-23 09:39:12 IST) |
| **Backup Format** | PostgreSQL Custom Archive (`-F c`, compressed, TOC indexed) |
| **Primary Archive File** | `backups/20261023_093912/entera_backup_20261023_093912.dump` |
| **Absolute Archive Path** | `C:\Users\sneha\Downloads\Entera_Project\backups\20261023_093912\entera_backup_20261023_093912.dump` |
| **Archive File Size** | **56,137 bytes** (54.82 KB) |
| **Companion SQL Script** | `backups/20261023_093912/entera_backup_20261023_093912.sql` (77,238 bytes / 75.43 KB) |
| **Git Exclusion Status** | Verified excluded via `.gitignore` rule `backups/` |

---

## 3. Toolchain Readiness Check

All required PostgreSQL command-line utilities were detected and verified:

| Tool | Version | Path | Status |
| :--- | :--- | :--- | :---: |
| `pg_dump` | 18.4 | `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` | Ready |
| `pg_restore` | 18.4 | `C:\Program Files\PostgreSQL\18\bin\pg_restore.exe` | Ready |
| `psql` | 18.4 | `C:\Program Files\PostgreSQL\18\bin\psql.exe` | Ready |

---

## 4. Source Database Connectivity & Health

Prior to executing the dump, read-only connectivity to the local database was confirmed:
- **Connection Status:** Reachable (`localhost:5432`)
- **Target Database:** `entera`
- **Connected Role:** `postgres`
- **Table Count in `public` Schema:** 15 tables
- **Safety Policy:** No data-modifying queries or schema modifications were performed.

---

## 5. Verification Results (`pg_restore --list`)

The backup archive was validated using `pg_restore --list`. The Table of Contents (TOC) analysis confirmed **128 total TOC catalog objects**, with **zero corruptions or errors**.

### Verified Application Tables (15/15)

| Catalog ID | Type | Schema | Object Name | Data Block Present? |
| :---: | :---: | :---: | :--- | :---: |
| 233 | TABLE | `public` | `apis` | Yes (ID 5199) |
| 244 | TABLE | `public` | `application_entities` | Yes (ID 5210) |
| 229 | TABLE | `public` | `application_modules` | Yes (ID 5195) |
| 240 | TABLE | `public` | `application_navigation` | Yes (ID 5206) |
| 238 | TABLE | `public` | `application_pages` | Yes (ID 5204) |
| 224 | TABLE | `public` | `applications` | Yes (ID 5190) |
| 231 | TABLE | `public` | `database_schemas` | Yes (ID 5197) |
| 235 | TABLE | `public` | `deployments` | Yes (ID 5201) |
| 236 | TABLE | `public` | `designer_applications` | Yes (ID 5202) |
| 227 | TABLE | `public` | `modules` | Yes (ID 5193) |
| 220 | TABLE | `public` | `organizations` | Yes (ID 5186) |
| 246 | TABLE | `public` | `password_reset_tokens` | Yes (ID 5212) |
| 242 | TABLE | `public` | `students` | Yes (ID 5208) |
| 226 | TABLE | `public` | `templates` | Yes (ID 5192) |
| 222 | TABLE | `public` | `users` | Yes (ID 5188) |

### Key Structural Objects Verified in TOC
- **Primary & Foreign Key Constraints:** `organizations_pkey`, `users_pkey`, `users_organization_id_fkey`, `applications_organization_id_fkey`, `application_modules_application_id_fkey`, `designer_applications_user_id_fkey`, etc.
- **Partial & Unique Indexes:**
  - `idx_one_active_app_per_org` on `applications (organization_id) WHERE archived = false`
  - `idx_users_lower_username` on `users (LOWER(username))`
  - `idx_password_reset_token_hash` on `password_reset_tokens (token_hash)`
- **Sequences:** All 15 `*_id_seq` identity sequences preserved with their sequence sets.
- **Decompression Extraction Test:** Extracted directly to SQL format without errors (77.2 KB SQL output).

---

## 6. Git Protection & Security Compliance

- **`.gitignore` Update:** Updated `.gitignore` to explicitly exclude:
  ```gitignore
  # Local Database Backups
  backups/
  *.dump
  *.backup
  *.sql
  ```
- **Rule Verification:** Verified using `git check-ignore -v` that all files inside `backups/` are ignored.
- **Working Tree Integrity:** No database secrets, passwords, or credentials were committed or exposed.
- **Local Database State:** Untouched and unmodified.

---

## 7. Next Steps (Pending Approval)

The database backup is complete, non-empty, and verified.

In accordance with the safety requirements:
- No connection to Supabase has been initiated yet.
- `server/migrate.js` has not been executed against Supabase.
- Awaiting user review and explicit approval before initiating the Supabase database migration.
