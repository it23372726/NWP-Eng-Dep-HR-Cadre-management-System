# HRMS Deployment Guide (Testing Hosting)

This guide deploys the HRMS stack for **free testing** using:

| Layer | Service | Project folder |
|-------|---------|----------------|
| Frontend | [Vercel](https://vercel.com) | `hrms-frontend/` |
| Backend | [Render](https://render.com) | `hrms/` |
| Database | [Aiven MySQL](https://aiven.io) | — |
| Source | GitHub | this repository |

Local development continues to work with the defaults in `hrms/src/main/resources/application.properties` and `VITE_API_BASE_URL` falling back to `http://localhost:8080`.

---

## Security warnings (read first)

- This free hosting setup is **only for testing**. It is not a substitute for official production hosting.
- **Do not upload real NIC numbers, dependent details, or real HR records** during testing. Use fictional sample data only.
- Real production data should later be moved to the **official NWP server** or other properly secured production hosting (HTTPS, backups, access control, and data-protection policies).
- Never commit `.env` files or real database/JWT credentials to GitHub.
- Employee photo uploads are stored on the Render filesystem (`./uploads/...`) and are **ephemeral** (lost on redeploy/restart). That is acceptable for testing only.
- Change the bootstrap `superadmin` password immediately after first login.

---

## Prerequisites

- GitHub repository with this project pushed
- Accounts: Aiven, Render, Vercel
- Local tools (optional, for verifying builds):
  - JDK **21**
  - Node.js 18+ and npm
  - MySQL 8+

---

## Clone and local setup

```bash
git clone https://github.com/it23372726/NWP-Eng-Dep-HR-Cadre-management-System.git
cd NWP-Eng-Dep-HR-Cadre-management-System
```

### Backend (local)

1. Start MySQL and create an empty database (or let the default URL create `nwp_hrms_host`).
2. Optionally export local overrides:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_mysql_password
export JWT_SECRET=your-long-local-secret
```

If unset, local defaults are username `root`, empty password, and a development-only JWT placeholder.

3. Run:

```bash
cd hrms
chmod +x mvnw
./mvnw spring-boot:run
```

On first start against an **empty** database the app creates only:

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `admin123` | `SUPER_ADMIN` |

No employees, offices, services, designations, cadres, role permissions, or organization settings are seeded.

### Frontend (local)

```bash
cd hrms-frontend
cp .env.example .env   # optional; defaults already point to localhost:8080
npm install
npm run dev
```

### First-login configuration order

1. Login as `superadmin` / `admin123` and **change the password**.
2. Open **Organization Settings** and save council/department names plus at least one district.
3. Create **Service Levels**, then **Services**, **Designations**, **Offices**, and **Cadre** records.
4. Open **Users → Manage Roles** before creating non–super-admin users.
5. Create employees manually.

---

## 1. Create an Aiven MySQL database

1. Sign in to [Aiven](https://console.aiven.io/) and create a **MySQL** service (free/trial tier is fine for testing).
2. Open the service **Overview** / **Connection information**.
3. Note these values (names may vary slightly in the Aiven UI):

| Variable | Aiven source |
|----------|----------------|
| `DB_HOST` | Service host (e.g. `mysql-xxxx.aivencloud.com`) |
| `DB_PORT` | MySQL port (often `12345`, not `3306`) |
| `DB_NAME` | Database name (e.g. `defaultdb`) |
| `DB_USERNAME` | User (e.g. `avnadmin`) |
| `DB_PASSWORD` | Password |

4. Ensure the service allows connections from the internet (or from Render). Aiven free tiers typically expose a public host with SSL required — the backend prod config uses `sslMode=REQUIRED`.

You do **not** need to create tables manually. With `spring.jpa.hibernate.ddl-auto=update`, the app creates/updates schema on startup (suitable for testing).

---

## 2. Deploy the backend to Render

Render does **not** offer a native Java runtime. Deploy the Spring Boot API with **Docker** using `hrms/Dockerfile`.

1. In Render, create a **New Web Service** and connect your GitHub repository.
2. Configure:

| Setting | Value |
|---------|--------|
| **Root Directory** | `hrms` |
| **Runtime / Language** | **Docker** (not Node) |
| **Dockerfile Path** | `Dockerfile` (default; lives in `hrms/`) |
| **Build Command** | *(leave empty — Docker builds the image)* |
| **Start Command** | *(leave empty — image `ENTRYPOINT` starts the JAR)* |

3. If you previously created a **Node** service for this repo, delete it or create a **new** Web Service with Docker. You cannot switch an existing Node service to Docker from the dashboard Settings UI.
4. Add environment variables (see table below). Leave `FRONTEND_URL` blank or temporary until Vercel is deployed; you will update it in step 4.
5. Deploy and wait until the service is live (first Docker build can take several minutes).
6. Copy the public backend URL, e.g. `https://your-backend-name.onrender.com`.
7. Smoke-check health (no auth required):

   `GET https://your-backend-name.onrender.com/api/health`

   Expected response:

   ```json
   { "status": "UP" }
   ```

### Render environment variables

| Variable | Example / notes |
|----------|-----------------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_HOST` | From Aiven |
| `DB_PORT` | From Aiven |
| `DB_NAME` | From Aiven |
| `DB_USERNAME` | From Aiven |
| `DB_PASSWORD` | From Aiven |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (set after Vercel deploy; no trailing slash) |
| `JWT_SECRET` | Long random string (at least 32+ characters). Generate a new secret; do not reuse any old default. |
| `HRMS_BOOTSTRAP_SUPER_ADMIN_PASSWORD` | Required on first empty-DB start in production. Set a strong password. |

Optional:

| Variable | Default | Notes |
|----------|---------|--------|
| `JWT_EXPIRATION` | `86400000` | Token lifetime in milliseconds (24h) |
| `PORT` | Set by Render | App binds via `server.port=${PORT:8080}` |
| `HRMS_BOOTSTRAP_SUPER_ADMIN_ENABLED` | `true` | Set `false` after the first bootstrap if desired |
| `HRMS_BOOTSTRAP_SUPER_ADMIN_USERNAME` | `superadmin` | Bootstrap username when users table is empty |

Reference file listing the same names: [`hrms/.env.example`](hrms/.env.example).

**Bootstrap note:** On first start against an empty database, the production profile creates `superadmin` **only when** `HRMS_BOOTSTRAP_SUPER_ADMIN_PASSWORD` is set. Local development defaults to password `admin123`. Change the password immediately after first login. No demo employees or organization catalogs are imported.

---

## 3. Deploy the frontend to Vercel

1. In Vercel, import the same GitHub repository.
2. Configure the project:

| Setting | Value |
|---------|--------|
| **Root Directory** | `hrms-frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

3. Add the environment variable:

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://your-backend-name.onrender.com` |

Do **not** append `/api` — the frontend axios client adds `/api` automatically.

Local example (for a machine `.env` file, never commit it):

```env
VITE_API_BASE_URL=http://localhost:8080
```

Production example:

```env
VITE_API_BASE_URL=https://your-backend-name.onrender.com
```

4. Deploy. Copy the frontend URL, e.g. `https://your-frontend.vercel.app`.
5. `vercel.json` is already in `hrms-frontend/` so React Router page refreshes work on deployed routes.

---

## 4. Update Render `FRONTEND_URL` after Vercel

1. In Render → your web service → **Environment**.
2. Set:

   `FRONTEND_URL=https://your-frontend.vercel.app`

   (no trailing slash)

3. Save and **redeploy** the backend so CORS picks up the hosted origin.
4. Local Vite origins (`http://localhost:5173`, etc.) remain allowed for local frontend development against a remote or local API.

---

## 5. Test the deployed system

1. **Backend health:** open `https://your-backend-name.onrender.com/api/health` → `{ "status": "UP" }`.
2. **Frontend:** open the Vercel URL.
3. **Login:** use the bootstrap super-admin created with `HRMS_BOOTSTRAP_SUPER_ADMIN_PASSWORD`. Change the password after first login.
4. Configure Organization Settings, then create reference data and employees manually (use **fictional** data only).
5. **Reports:** open available report pages if your role allows them.

If the browser shows CORS errors, confirm `FRONTEND_URL` matches the Vercel origin exactly (including `https://`) and that the backend was redeployed after the change.

If login fails with network errors, confirm `VITE_API_BASE_URL` points at the Render URL **without** `/api`, and that the Render service is not sleeping/failed (free tiers may cold-start slowly).

---

## Local development builds

### Backend

```bash
cd hrms
chmod +x mvnw
./mvnw spring-boot:run
```

Uses local MySQL settings in `application.properties` (no `prod` profile required).

### Frontend

```bash
cd hrms-frontend
cp .env.example .env   # optional; defaults already point to localhost:8080
npm install
npm run dev
```

### Verify production-style builds locally

```bash
# Backend JAR (local Maven)
cd hrms
chmod +x mvnw && ./mvnw clean package -DskipTests
java -jar target/hrms-0.0.1-SNAPSHOT.jar   # needs MySQL; for prod profile, export env vars first

# Backend Docker image (same path Render uses)
cd hrms
docker build -t hrms-backend .
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e PORT=8080 \
  -e DB_HOST=... -e DB_PORT=... -e DB_NAME=... \
  -e DB_USERNAME=... -e DB_PASSWORD=... \
  -e JWT_SECRET=... \
  -e HRMS_BOOTSTRAP_SUPER_ADMIN_PASSWORD=... \
  hrms-backend

# Frontend
cd hrms-frontend
npm install
npm run build
```

---

## Quick reference — environment variables

### Render (backend)

```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=
DB_PORT=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
FRONTEND_URL=https://your-frontend.vercel.app
JWT_SECRET=
HRMS_BOOTSTRAP_SUPER_ADMIN_PASSWORD=
```

### Vercel (frontend)

```
VITE_API_BASE_URL=https://your-backend-name.onrender.com
```

---

## Suggested deploy order

1. Aiven MySQL  
2. Render backend (health check)  
3. Vercel frontend (`VITE_API_BASE_URL` → Render URL)  
4. Set Render `FRONTEND_URL` → Vercel URL and redeploy backend  
5. End-to-end smoke tests  

Again: this stack is for **testing only**. Do not store real personal or HR production data here.
