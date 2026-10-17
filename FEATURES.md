# EduVoice Features

Complete feature overview of the EduVoice anonymous feedback platform.

## Core Features

### 🔐 Anonymous Feedback
- **Blind Signature Cryptography**: Uses RSA blind signatures (Chaum's algorithm)
- **Zero-Knowledge Architecture**: Server cannot link feedback to students
- **One-Time Credentials**: Each credential works exactly once per course
- **Client-Side Blinding**: Nonce and blinding factor never leave the browser

### 👥 User Roles

#### Students
- View enrolled courses
- Obtain sealed credentials
- Submit anonymous feedback
- Rate on 7 dimensions (1-5 scale):
  - Teaching clarity
  - Teaching pace
  - Use of practical examples
  - Clearing doubts
  - Student engagement
  - Content relevance
  - Overall experience
- Provide written feedback:
  - What went well
  - Areas for improvement
  - Constructive suggestions

#### Teachers
- View aggregated feedback per course
- Access detailed analytics:
  - Average ratings across dimensions
  - Sentiment distribution
  - Topic mentions in comments
  - Weekly trend analysis
  - Rating distributions with statistics
- Read anonymous comments (when threshold met)
- No ability to identify individual students

#### Administrators
- Create and manage user accounts (bulk import supported)
- Create courses and manage enrollments
- Open/close feedback windows
- Moderate flagged content
- View system-wide analytics:
  - Total users, courses, feedback
  - Recent activity (7-day window)
  - Average ratings across platform
  - User distribution
- Review and approve flagged comments

## Security & Privacy

### Privacy Protection
- **Minimum Response Thresholds**:
  - 5 responses minimum before showing any statistics
  - 10 responses minimum before showing comments
  - Configurable per deployment
- **Date-Only Storage**: No precise timestamps (prevents timing attacks)
- **Random Comment Order**: Comments shuffled to prevent identification
- **No User References**: Feedback tables have no foreign keys to users

### Content Safety
- **Automatic Flagging**:
  - Toxic/abusive language detection
  - PII detection (emails, phone numbers, register numbers)
  - Identifying information warnings
- **Human Moderation**: Flagged content hidden until admin review
- **Three-State Moderation**: visible | flagged | removed

### Authentication & Security
- **Argon2 Password Hashing**: Industry-standard secure hashing
- **HttpOnly Cookies**: Protection against XSS attacks
- **Rate Limiting**: Prevents abuse and brute-force attacks
- **Account Lockout**: 5 failed attempts = 15-minute lockout
- **Security Headers**: XSS, clickjacking, and MIME-sniffing protection
- **Production Checks**: Refuses to start with weak secrets

## Analytics & Insights

### Teacher Analytics
- **Feedback Summary Dashboard**:
  - Average ratings per dimension
  - Sentiment breakdown (positive/neutral/negative)
  - Topic mentions (pace, clarity, examples, etc.)
  - Anonymous comments (randomized order)
  
- **Trend Analysis**:
  - Weekly progression of ratings
  - Response count over time
  - Average score trends
  
- **Rating Distributions**:
  - Histogram of rating values (1-5)
  - Mean and standard deviation per dimension
  - Total response count

### Admin Analytics
- **System Overview**:
  - Total users by role
  - Active courses count
  - Total feedback submissions
  - Recent activity metrics
  
- **User Distribution**: Visual breakdown of students vs teachers

- **Average Ratings**: Platform-wide quality metrics

- **Moderation Queue**: Flagged content count and details

## Text Analysis

### Sentiment Analysis
- Positive, negative, neutral, or mixed classification
- Based on keyword analysis
- Optional: Hugging Face transformer models (requires GPU)

### Topic Detection
- Automatically extracts mentioned topics:
  - Pace (speed, rushed, slow)
  - Clarity (understanding, confusing)
  - Examples (practical, real-world)
  - Engagement (interesting, boring)
  - Resources (notes, materials)
  - Assessment (tests, grading)
  - Availability (approachable, office hours)

### Content Filtering
- **Toxicity Detection**: Identifies abusive language
- **PII Detection**: 
  - Register number patterns
  - Email addresses
  - Phone numbers
  - Other identifying information

## User Experience

### Responsive Design
- Mobile-first approach
- Works on phones, tablets, and desktops
- Touch-friendly controls
- Adaptive layouts

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Sufficient color contrast

### Visual Design
- **Theme**: Warm, academic aesthetic
- **Typography**: Fraunces (display) + Inter (body)
- **Colors**: Brand-neutral palette with clear hierarchy
- **Components**: Cards, pills, progress bars, charts
- **Feedback**: Clear success/error states

### Animations
- Wax seal "pressing" animation during credential issuance
- Smooth transitions for ratings and charts
- Respects `prefers-reduced-motion`

## Technical Features

### Backend
- **FastAPI Framework**: Modern, fast, with automatic API docs
- **SQLAlchemy ORM**: Database abstraction layer
- **PostgreSQL Production**: Scalable, ACID-compliant
- **SQLite Development**: Zero-config local database
- **Pydantic Validation**: Request/response validation
- **CORS Support**: Configurable origins
- **Rate Limiting**: Per-IP and per-account limits

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Client-Side Crypto**: Web Crypto API + BigInt
- **localStorage**: Browser-side credential storage
- **Fetch API**: Modern HTTP client
- **CSS Variables**: Theme tokens for easy customization
- **No Build Dependencies**: Pure CSS, no preprocessors

### Deployment
- **Vercel Ready**: Frontend optimized for Vercel
- **Serverless Compatible**: Backend works on Render, Railway
- **Docker Support**: Via docker-compose.yml
- **Environment Config**: `.env` file configuration
- **CI/CD Ready**: GitHub Actions compatible
- **Database Migrations**: Automatic in development

## API Features

### RESTful Design
- Clear endpoint structure
- Standard HTTP methods
- JSON request/response
- Consistent error format

### Documentation
- OpenAPI/Swagger spec (development mode)
- Interactive API explorer at `/docs`
- Complete endpoint documentation in `docs/API.md`

### Versioning
- URL-based versioning ready
- Backward compatibility maintained

## Data Management

### Bulk Operations
- Import multiple users at once
- Enroll all students in a course
- Batch user creation with CSV-style input

### Flexible Enrollment
- Course-specific enrollments
- Semester-based organization
- Teacher-subject assignments

### Feedback Lifecycle
- Open/close feedback windows
- View response rates
- Track submission progress

## Extensibility

### Configurable Thresholds
- Privacy thresholds adjustable via environment variables
- Rate limits configurable
- Session expiry customizable

### Pluggable ML Models
- Default: Keyword-based analysis (fast, no dependencies)
- Optional: Hugging Face models for better accuracy
- Easy to swap analysis implementations

### Multi-Language Ready
- UI text can be localized
- Topic keywords can be customized per language
- Supports international phone/email formats in PII detection

## Monitoring & Debugging

### Logging
- Structured application logs
- Security event logging
- Error tracking

### Health Checks
- `/health` endpoint for monitoring
- Database connection validation
- Production configuration checks

### Development Tools
- SQLite for local testing
- Hot-reload in development
- Detailed error messages in dev mode
- API documentation auto-generated

## Known Limitations

### Credential Recovery
- Lost credentials cannot be recovered
- Browser storage dependent
- No server-side backup (by design)

### Network Metadata
- IP addresses and timing can still correlate requests
- Recommend Tor or VPN for high-stakes scenarios

### ML Accuracy
- Basic keyword-based analysis
- May miss code-mixed languages (e.g., Tanglish)
- Best for English feedback

### Scalability
- Single RSA key (can bottleneck at very high scale)
- Consider key sharding for 10K+ concurrent users

### No SSO/Email
- Manual account creation only
- No password reset via email
- Designed for controlled educational environments

---

## Roadmap (Potential Future Features)

- [ ] Export feedback to CSV/PDF
- [ ] Multi-semester trend comparison
- [ ] Real-time feedback notifications
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced ML models for multilingual support
- [ ] Custom question sets per course
- [ ] Anonymous Q&A between students and teachers
- [ ] Integration with LMS platforms (Moodle, Canvas)
- [ ] Department-level analytics
- [ ] Feedback templates
- [ ] Scheduled feedback windows
- [ ] Email notifications (with privacy protection)
- [ ] Two-factor authentication
- [ ] LDAP/Active Directory integration

---

**For detailed technical documentation, see:**
- `docs/API.md` - Complete API reference
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/THREAT_MODEL.md` - Security analysis
- `README.md` - Quick start guide
