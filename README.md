# EduVoice

Anonymous student feedback where the server **cannot** link a feedback record to the student who wrote it.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL (SQLite for local development)
- **Frontend:** Next.js 14, TypeScript
- **Anonymity:** RSA blind-signature credentials (Chaum), one per student per course
- **Analysis:** sentiment, toxicity, identifying-information detection and topic counts (word lists by default, Hugging Face models optional)
- **Admin tools:** create accounts and courses, open or close feedback, moderate flagged comments

To put it online, follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (GitHub, Vercel, Neon).

## Run it locally

```bash
# Backend  (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
python -m app.seed            # demo users and courses (development only)
uvicorn app.main:app --reload

# Frontend  (http://localhost:3000)
cd frontend
cp .env.example .env.local    # optional: add NEXT_PUBLIC_SHOW_DEMO=true to show demo logins
npm install
npm run dev
```

Demo logins: `s01`..`s08` / `student123`, `kumar` / `teacher123`, `admin` / `admin123`.
Run the tests with `cd backend && pytest`.

## How the anonymity works

```
Browser                                   Server
  │  nonce = random()                       │
  │  blinded = blind(H("course:nonce"))     │
  │ ──── POST /credentials/issue ─────────► │  checks session, enrolment, not issued before
  │      (logged in, blinded value only)    │  signs the blinded value; records "student X got one"
  │ ◄──────────── blind signature ───────── │
  │  signature = unblind(...)               │
  │                                         │
  │ ──── POST /feedback (NO cookie) ──────► │  verifies signature, marks nonce spent,
  │      nonce + signature + answers        │  stores feedback with no student reference
```

The server sees the *blinded* value when it signs and the *unblinded* credential at submission, and cannot
connect the two. The `feedback` and `spent_tokens` tables hold no user reference, and `issuances` records who
received a credential but never which one.

Other protections:
- Teachers see nothing until a course has 5 responses, and comments only at 10, in random order.
- Only the date is stored, not a precise timestamp.
- Comments with abusive language or identifying details (emails, phone numbers, register numbers) stay hidden until an admin approves them.
- Passwords are hashed with Argon2, sessions are HttpOnly cookies, accounts lock for 15 minutes after 5 failed sign-ins, and inputs are validated.
- In production the app refuses to start with weak secrets or a missing signing key.

## Layout

```
backend/app/blind.py        blind-signature maths (mirrored in frontend/lib/blind.ts)
backend/app/models.py       schema, with the identity/feedback separation documented
backend/app/routers/        auth, credentials, student, feedback (anonymous), teacher, admin
backend/app/bootstrap.py    genkey / init commands for first-time production setup
backend/app/ml.py           sentiment, toxicity, PII, topics
backend/index.py            Vercel entrypoint
frontend/lib/blind.ts       browser-side blinding (BigInt + Web Crypto)
frontend/app/               login, student form, teacher dashboard, admin, account
docs/                       DEPLOYMENT.md and THREAT_MODEL.md
```

## Known limits

- **Lost credential means no feedback.** It lives in the browser's localStorage. A reset feature would let an admin weaken the one-per-student guarantee, so there isn't one.
- **Network metadata.** IP addresses and timing can still link the two requests. See the deployment checklist.
- **Educational crypto.** Full-domain-hash RSA blinding. For high-stakes use, move to RFC 9474 (RSABSSA) with a vetted library and keep the key in a KMS.
- **No email or SSO.** Accounts are created by the admin; connect your college's student records if you need more.
- **ML is basic.** Replace `backend/app/ml.py` with a model you train and evaluate, especially for code-mixed (Tanglish) comments.

## License

MIT
