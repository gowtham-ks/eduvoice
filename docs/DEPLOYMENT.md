# EduVoice - Deployment Guide

Complete guide to deploy EduVoice to production using Vercel (frontend) and Render/Railway (backend).

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Render or Railway account (free tier available)
- PostgreSQL database (Neon, Supabase, or included with Render/Railway)

## Part 1: Backend Deployment

### Option A: Deploy to Render

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → New → PostgreSQL
   - Note the Internal/External Database URL

2. **Deploy Backend**
   - Push your code to GitHub
   - Go to Render Dashboard → New → Web Service
   - Connect your repository
   - Configure:
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `python -m app.bootstrap init && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - Environment: Python 3.11+

3. **Set Environment Variables**
   ```env
   ENVIRONMENT=production
   DATABASE_URL=<your-postgres-url>
   JWT_SECRET=<generate-random-64-char-string>
   COOKIE_SECURE=true
   FRONTEND_ORIGIN=<your-vercel-url>
   ```

4. **Generate Signing Key**
   ```bash
   # Locally
   cd backend
   python -m app.bootstrap genkey
   # Copy the SIGNING_KEY_PEM_B64 value to Render environment variables
   ```

### Option B: Deploy to Railway

1. **Create New Project**
   - Go to Railway → New Project → Deploy from GitHub
   - Select your repository

2. **Add PostgreSQL**
   - Add → Database → PostgreSQL
   - Copy the DATABASE_URL from variables

3. **Configure Backend Service**
   - Settings → Environment Variables (same as Render above)
   - Settings → Deploy → Build Command: `pip install -r requirements.txt`
   - Settings → Deploy → Start Command: `python -m app.bootstrap init && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Part 2: Frontend Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   cd frontend
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Import to Vercel**
   - Go to Vercel Dashboard → Add New → Project
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Next.js
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Set Environment Variables**
   ```env
   NEXT_PUBLIC_API_URL=<your-backend-url>
   ```

4. **Add Rewrites** (vercel.json in frontend directory)
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "<your-backend-url>/:path*"
       }
     ]
   }
   ```

5. **Deploy**
   - Click Deploy
   - Note your Vercel URL
   - Update backend `FRONTEND_ORIGIN` with this URL

## Part 3: Database Initialization

After backend is deployed:

```bash
# The backend automatically runs migrations on startup
# For manual initialization:
python -m app.bootstrap init

# Create demo data (optional, development only):
python -m app.seed
```

## Part 4: Security Checklist

- [ ] `JWT_SECRET` is at least 64 random characters
- [ ] `SIGNING_KEY_PEM_B64` is set from `bootstrap genkey`
- [ ] `COOKIE_SECURE=true` in production
- [ ] `FRONTEND_ORIGIN` matches your Vercel domain
- [ ] Database uses SSL (most providers enable by default)
- [ ] Changed all default admin passwords
- [ ] API docs (`/docs`) are disabled in production (automatic)

## Part 5: First Login

1. Create admin account via backend console or seed script
2. Login at: `https://your-vercel-url.vercel.app`
3. Default demo credentials (if using seed):
   - Admin: `admin` / `admin123`
   - Teacher: `kumar` / `teacher123`
   - Student: `s01` / `student123`

**⚠️ Change these immediately in production!**

## Part 6: Custom Domain (Optional)

### Vercel Frontend
- Vercel Dashboard → Project → Settings → Domains
- Add your domain and follow DNS instructions

### Backend
- Render/Railway → Settings → Custom Domain
- Update `FRONTEND_ORIGIN` if domain changes

## Monitoring & Logs

**Render:**
- Dashboard → Your Service → Logs (live tail)

**Railway:**
- Project → Service → Deployments → View Logs

**Vercel:**
- Dashboard → Project → Deployments → View Function Logs

## Troubleshooting

**Backend won't start:**
- Check all environment variables are set
- Verify DATABASE_URL is correct
- Ensure signing key is generated and set

**Frontend can't reach backend:**
- Verify CORS settings in backend (`FRONTEND_ORIGIN`)
- Check API rewrite rules in vercel.json
- Test backend directly: `curl https://your-backend/health`

**Database connection errors:**
- Ensure PostgreSQL is running
- Check database URL format (postgresql+psycopg://)
- Verify SSL is enabled if required

## Scaling

**For higher traffic:**
- Render: Upgrade to paid plan for more instances
- Railway: Auto-scales with usage
- Database: Upgrade connection limits and storage
- Consider Redis for session storage
- Enable CDN for static assets

## Backup Strategy

1. **Database Backups**
   - Render: Automatic daily backups on paid plans
   - Railway: Manual backups via pg_dump
   - Neon: Point-in-time recovery

2. **Export feedback data**
   ```bash
   # Regular exports
   pg_dump $DATABASE_URL > backup.sql
   ```

---

**Cost Estimate (Free Tier):**
- Vercel: Free (commercial use allowed)
- Render/Railway: Free tier available
- Neon PostgreSQL: Free tier (3GB storage)
- Total: $0/month for small deployments

**Paid Tier (~$20-40/month):**
- Better performance
- Custom domains
- Automatic backups
- More resources
