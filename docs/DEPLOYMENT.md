# Deploying EduVoice (GitHub + Vercel + Neon)

EduVoice is two apps in one repository, so you create **two Vercel projects** from the same GitHub repo,
plus a free PostgreSQL database. Total cost: free tiers.

```
Browser ──► Vercel project 1: frontend (Next.js)
                 │  /api/*  is proxied to
                 ▼
            Vercel project 2: backend (FastAPI) ──► Neon PostgreSQL
```

The frontend proxies `/api/*` to the backend, so the login cookie belongs to one domain.

## 0. Push to GitHub

```bash
cd eduvoice
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/eduvoice.git
git push -u origin main
```

Check `git status` first: no `.env`, `.pem` or `.db` files should be listed (`.gitignore` covers them).

## 1. Create the database (Neon)

1. Sign up at neon.tech and create a project.
2. Copy the connection string (it looks like `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).
   Use the **pooled** one if offered.

## 2. Generate your secrets (on your computer)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python -c "import secrets; print(secrets.token_urlsafe(48))"   # -> JWT_SECRET
python -m app.bootstrap genkey                                  # -> SIGNING_KEY_PEM_B64
```

Keep both somewhere safe (a password manager). **The signing key must never change** once students have
credentials, or their unused credentials stop working.

## 3. Create the tables and the first admin

Still in `backend/`, pointing at your Neon database:

```bash
# macOS / Linux
DATABASE_URL="postgresql://...neon.tech/db?sslmode=require" ADMIN_USERNAME=admin python -m app.bootstrap init
# Windows PowerShell
$env:DATABASE_URL="postgresql://...neon.tech/db?sslmode=require"; $env:ADMIN_USERNAME="admin"; python -m app.bootstrap init
```

It asks for the admin password (12+ characters).

## 4. Deploy the backend (Vercel project 1)

1. Vercel dashboard, **Add New, Project**, import your GitHub repo.
2. **Root Directory:** `backend`. Vercel detects FastAPI from `requirements.txt` and `index.py`.
3. Environment variables:

| Name | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | your Neon connection string |
| `JWT_SECRET` | from step 2 |
| `SIGNING_KEY_PEM_B64` | from step 2 |
| `COOKIE_SECURE` | `true` |
| `FRONTEND_ORIGIN` | leave as `https://placeholder.vercel.app` for now, fix in step 6 |

4. Deploy, then open `https://<backend>.vercel.app/health`. You should see `{"status":"ok"}`.
   If you see a Vercel login page instead, turn off **Deployment Protection** for this project
   (Settings, Deployment Protection).

If the backend refuses to start, the deployment log lists exactly which setting is unsafe or missing.

## 5. Deploy the frontend (Vercel project 2)

1. **Add New, Project**, import the same repo.
2. **Root Directory:** `frontend` (framework: Next.js).
3. Environment variable: `BACKEND_URL` = `https://<backend>.vercel.app` (no trailing slash).
4. Deploy and note the URL, for example `https://eduvoice.vercel.app`.

## 6. Connect them

In the backend project set `FRONTEND_ORIGIN` to the frontend URL and **redeploy** the backend
(Deployments, the three dots, Redeploy).

## 7. First use

1. Sign in as the admin, then **Add accounts** for teachers, then for students.
2. **Add a course** (teacher username, semester, which students).
3. Students sign in and give feedback. Teachers see results once 5 students have responded.

## Updating

Push to `main`. Vercel redeploys both projects. The tests and build run in GitHub Actions on every push.

## Production checklist

- [ ] `ENVIRONMENT=production`, `COOKIE_SECURE=true`, strong `JWT_SECRET`, and the signing key stored only in Vercel
- [ ] Demo data was never loaded (`python -m app.seed` refuses to run in production)
- [ ] `NEXT_PUBLIC_SHOW_DEMO` is not set
- [ ] In Vercel, add a rate-limit rule (Firewall) for `/api/feedback` and `/api/auth/login`. The built-in limiter is per instance
- [ ] Do not enable extra request logging that records client IPs on `/api/feedback` and `/api/credentials/issue`
- [ ] Tell students how anonymity works and what it cannot hide (see `docs/THREAT_MODEL.md`)
- [ ] Get permission from your institution before using it with real students; treat responses as personal data

## Other hosts

The backend is a standard ASGI app, so it also runs on Render, Railway or Fly.io:
`pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
Set the same environment variables. Use a container host if you want the optional Hugging Face models,
which are too large for serverless functions.
