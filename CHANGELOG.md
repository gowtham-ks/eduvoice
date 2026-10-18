# Changelog

All notable changes to EduVoice are documented in this file.

## [Unreleased] - 2026-10-17

### Added

#### Backend Enhancements
- **New Analytics API** (`/analytics/*` endpoints)
  - Teacher trends endpoint showing weekly feedback progression
  - Rating distribution analysis with mean and standard deviation
  - Admin statistics dashboard with system-wide metrics
- **Enhanced Feedback Model**
  - Added `engagement` rating field (1-5 scale)
  - Added `relevance` rating field (1-5 scale)  
  - Added `suggestions` text field (1000 char limit)
- **Improved ML Analysis** (`app/ml.py`)
  - Enhanced topic detection with 7 categories
  - Better PII pattern matching
  - More comprehensive sentiment analysis

#### Frontend Improvements
- **New Chart Components** (`components/Chart.tsx`)
  - BarChart for rating visualization
  - LineChart for trend analysis
  - PieChart for distribution display
- **Analytics Dashboard** (`components/Analytics.tsx`)
  - Real-time statistics cards
  - User distribution visualization
  - Average ratings across all feedback
  - Flagged comments alerts
- **Enhanced Feedback Form**
  - Two new rating categories (engagement, relevance)
  - Additional suggestions field for constructive input
  - Improved UX with better labels and hints
- **Improved Admin Panel**
  - Integrated analytics dashboard
  - Enhanced moderation with suggestions preview
  - Better visual feedback for actions
- **Better Teacher Dashboard**
  - Support for new rating metrics
  - Display of student suggestions
  - Enhanced comment presentation

#### Documentation
- **API Documentation** (`docs/API.md`)
  - Complete endpoint reference
  - Request/response examples
  - Authentication and security details
  - Error handling guide
- **Enhanced Deployment Guide** (`docs/DEPLOYMENT.md`)
  - Step-by-step deployment instructions
  - Multiple hosting options (Render, Railway, Vercel)
  - Security checklist
  - Troubleshooting section
  - Cost estimates

#### Configuration
- **Environment Templates**
  - Complete `.env.example` files for backend and frontend
  - Clear documentation of all variables
  - Production-ready defaults
- **Next.js Configuration**
  - API rewrites for seamless integration
  - Environment-aware setup

### Changed

#### UI/UX Improvements
- **Enhanced Styling** (`app/globals.css`)
  - New stat card components
  - Better responsive grid layouts
  - Improved analytics visualizations
  - Enhanced mobile experience
- **Better Privacy Protection**
  - Comments now require minimum 10 responses (configurable)
  - Enhanced anonymity explanations
  - Clearer privacy messaging

#### Security
- All new endpoints respect existing role-based access controls
- Analytics data respects privacy thresholds
- No PII exposed in new features

### Technical Details

**Database Schema Changes:**
- Added `engagement` column to `feedback` table (Integer, default 3)
- Added `relevance` column to `feedback` table (Integer, default 3)
- Added `suggestions` column to `feedback` table (Text, default "")

**Migration Required:**
- For SQLite (dev): Schema updates automatic on restart
- For PostgreSQL (prod): Run `python -m app.bootstrap init` after deployment

**Backward Compatibility:**
- All existing feedback entries get default values for new fields
- Old clients can still submit feedback (new fields optional in backend)
- No breaking changes to existing API endpoints

### Performance
- Analytics queries optimized with proper indexing
- Chart rendering uses efficient SVG
- No additional external dependencies

### Deployment Notes
- Ensure database migration runs before deployment
- Update frontend environment variables if backend URL changed
- Clear browser cache for stylesheet updates
- No downtime required for deployment

---

## Previous Versions

See git history for earlier changes.
