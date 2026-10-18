# EduVoice API Documentation

Complete API reference for the EduVoice backend.

## Base URL

**Development:** `http://localhost:8000`  
**Production:** Your deployed backend URL

## Authentication

All authenticated endpoints require a session cookie. Sessions expire after 60 minutes of inactivity (configurable via `JWT_EXPIRE_MINUTES`).

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "student01",
  "password": "password123"
}
```

**Response:**
```json
{
  "name": "Student Name",
  "role": "student"
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid credentials
- `429` - Account locked (too many failed attempts)

### Logout
```http
POST /auth/logout
```

### Get Current User
```http
GET /auth/me
```

**Response:**
```json
{
  "name": "Student Name",
  "role": "student"
}
```

---

## Student Endpoints

### List Enrolled Courses
```http
GET /student/assignments
```

**Response:**
```json
[
  {
    "assignment_id": 1,
    "subject": "Data Structures",
    "subject_code": "CS301",
    "teacher": "Dr. Kumar",
    "semester": "Sem 5",
    "credential_issued": false
  }
]
```

### Get Course Details
```http
GET /student/assignments/{assignment_id}
```

---

## Credentials (Blind Signature)

### Get Public Key
```http
GET /credentials/public-key
```

**Response:**
```json
{
  "n": "hexadecimal_modulus",
  "e": "hexadecimal_exponent"
}
```

### Issue Credential
```http
POST /credentials/issue
Content-Type: application/json

{
  "assignment_id": 1,
  "blinded": "hexadecimal_blinded_value"
}
```

**Response:**
```json
{
  "signature": "hexadecimal_blind_signature"
}
```

**Notes:**
- Requires authentication
- One credential per student per assignment
- Returns `409` if already issued

---

## Feedback Submission

### Submit Feedback (Anonymous)
```http
POST /feedback
Content-Type: application/json
Credentials: omit

{
  "assignment_id": 1,
  "nonce": "hex_nonce_32_to_64_chars",
  "signature": "hex_signature",
  "clarity": 4,
  "pace": 3,
  "examples": 5,
  "doubts": 4,
  "overall": 4,
  "engagement": 5,
  "relevance": 4,
  "went_well": "Clear explanations and good examples",
  "to_improve": "Could slow down during complex topics",
  "suggestions": "More practice problems would help"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid signature
- `404` - Course closed or not found
- `409` - Credential already used
- `429` - Rate limit exceeded

**Notes:**
- Must NOT include authentication cookies
- Ratings are 1-5
- Comments max 1000 characters each
- Automatically analyzed for sentiment and flags

---

## Teacher Endpoints

### Get Feedback Summary
```http
GET /teacher/summary
```

**Response:**
```json
[
  {
    "assignment_id": 1,
    "subject": "Data Structures",
    "subject_code": "CS301",
    "semester": "Sem 5",
    "responses": 12,
    "needed": 5,
    "available": true,
    "ratings": {
      "overall": 4.2,
      "clarity": 4.5,
      "pace": 3.8,
      "examples": 4.7,
      "doubts": 4.1,
      "engagement": 4.3,
      "relevance": 4.6
    },
    "sentiment": {
      "positive": 8,
      "neutral": 3,
      "negative": 1
    },
    "topics": {
      "clarity": 5,
      "examples": 8,
      "pace": 3
    },
    "comments": [
      {
        "went_well": "Excellent examples",
        "to_improve": "Sometimes too fast",
        "suggestions": "More time for questions"
      }
    ],
    "comments_needed": 10
  }
]
```

**Privacy Protection:**
- `available: false` if responses < 5
- Comments hidden if responses < 10
- Comments shown in random order
- No timestamps or identifying info

---

## Analytics Endpoints

### Teacher Trends
```http
GET /analytics/teacher/trends/{assignment_id}
```

**Response:**
```json
{
  "available": true,
  "trends": [
    {
      "week": "2026-W41",
      "count": 5,
      "avg_overall": 4.2,
      "avg_clarity": 4.4,
      "avg_engagement": 4.0
    }
  ],
  "total_responses": 12
}
```

### Rating Distribution
```http
GET /analytics/teacher/distribution/{assignment_id}
```

**Response:**
```json
{
  "available": true,
  "distribution": {
    "clarity": {
      "distribution": {
        "5": 5,
        "4": 4,
        "3": 2,
        "2": 1,
        "1": 0
      },
      "mean": 4.08,
      "std": 0.9
    }
  },
  "total": 12
}
```

### Admin Statistics
```http
GET /analytics/admin/stats
```

**Response:**
```json
{
  "users": {
    "total": 150,
    "students": 140,
    "teachers": 9
  },
  "courses": 12,
  "feedback": {
    "total": 340,
    "flagged": 2,
    "recent_7_days": 45
  },
  "average_ratings": {
    "overall": 4.1,
    "clarity": 4.3,
    "pace": 3.9,
    "engagement": 4.0
  }
}
```

---

## Admin Endpoints

### Course Overview
```http
GET /admin/overview
```

**Response:**
```json
[
  {
    "assignment_id": 1,
    "subject": "Data Structures",
    "teacher": "Dr. Kumar",
    "semester": "Sem 5",
    "enrolled": 45,
    "responses": 38,
    "is_open": true
  }
]
```

### Flagged Comments
```http
GET /admin/moderation
```

**Response:**
```json
[
  {
    "id": 23,
    "subject": "Data Structures",
    "went_well": "",
    "to_improve": "Flagged content",
    "suggestions": "",
    "flags": ["toxic"]
  }
]
```

### Moderate Comment
```http
POST /admin/moderation/{feedback_id}
Content-Type: application/json

{
  "action": "approve"
}
```

**Actions:** `approve` | `remove`

### Create Users (Bulk)
```http
POST /admin/users
Content-Type: application/json

{
  "role": "student",
  "users": [
    {
      "username": "john.doe",
      "name": "John Doe",
      "password": "TempPass123"
    }
  ]
}
```

**Response:**
```json
{
  "created": 1,
  "skipped": ["existing.user"]
}
```

### Create Course
```http
POST /admin/courses
Content-Type: application/json

{
  "subject_code": "CS301",
  "subject_name": "Data Structures",
  "teacher_username": "kumar",
  "semester": "Sem 5",
  "student_usernames": ["john.doe", "jane.smith"],
  "enroll_all_students": false
}
```

**Response:**
```json
{
  "assignment_id": 1,
  "enrolled": 2,
  "unknown_students": []
}
```

### Toggle Course Open/Closed
```http
POST /admin/assignments/{assignment_id}/open
Content-Type: application/json

{
  "is_open": false
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (wrong role)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Server Error

---

## Rate Limiting

- Feedback submission: 30 requests per 60 seconds per IP
- Login: 5 failed attempts = 15 minute lockout per account

---

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`
- `Strict-Transport-Security` (production only)

---

## CORS

Allowed origins are configured via `FRONTEND_ORIGIN` environment variable. Credentials (cookies) are allowed only from that origin.

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Database Schema

See `backend/app/models.py` for the complete schema. Key points:

- **Zero-knowledge design:** No foreign keys link identity to feedback
- **Issuances table:** Records that a credential was issued, never which one
- **SpentToken table:** Hash of used nonces, prevents replay
- **Feedback table:** No user reference, only assignment_id

---

## Development

**Enable API docs:**
```bash
# Set ENVIRONMENT=development in .env
# Docs available at http://localhost:8000/docs
```

**Run tests:**
```bash
cd backend
pytest
```

---

## Support

For issues or questions:
- Check logs: backend service logs show detailed errors
- Review `docs/THREAT_MODEL.md` for security design
- See `docs/DEPLOYMENT.md` for deployment issues
