"""Advanced analytics endpoints for deeper insights into feedback data."""
from collections import Counter
from datetime import datetime, timedelta
from statistics import mean, stdev

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Feedback, Teacher, User
from ..security import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/teacher/trends/{assignment_id}")
def teacher_trends(
    assignment_id: int,
    user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db),
):
    """Get trend data showing feedback over time for a specific course."""
    teacher = db.scalar(select(Teacher).where(Teacher.user_id == user.id))
    if not teacher:
        raise HTTPException(404, "No teacher profile linked")

    assignment = db.get(Assignment, assignment_id)
    if not assignment or assignment.teacher_id != teacher.id:
        raise HTTPException(404, "Course not found")

    feedback = db.scalars(
        select(Feedback)
        .where(Feedback.assignment_id == assignment_id, Feedback.moderation != "removed")
        .order_by(Feedback.day)
    ).all()

    if len(feedback) < 5:
        return {"available": False, "message": "Not enough responses yet"}

    # Group by week
    weekly_data = {}
    for fb in feedback:
        week_key = fb.day.strftime("%Y-W%U")
        if week_key not in weekly_data:
            weekly_data[week_key] = []
        weekly_data[week_key].append(fb)

    trends = []
    for week, items in sorted(weekly_data.items()):
        trends.append({
            "week": week,
            "count": len(items),
            "avg_overall": round(mean(f.overall for f in items), 2),
            "avg_clarity": round(mean(f.clarity for f in items), 2),
            "avg_engagement": round(mean(f.engagement for f in items), 2),
        })

    return {"available": True, "trends": trends, "total_responses": len(feedback)}


@router.get("/teacher/distribution/{assignment_id}")
def rating_distribution(
    assignment_id: int,
    user: User = Depends(require_role("teacher")),
    db: Session = Depends(get_db),
):
    """Get distribution of ratings for detailed analysis."""
    teacher = db.scalar(select(Teacher).where(Teacher.user_id == user.id))
    if not teacher:
        raise HTTPException(404, "No teacher profile linked")

    assignment = db.get(Assignment, assignment_id)
    if not assignment or assignment.teacher_id != teacher.id:
        raise HTTPException(404, "Course not found")

    feedback = db.scalars(
        select(Feedback).where(
            Feedback.assignment_id == assignment_id, Feedback.moderation != "removed"
        )
    ).all()

    if len(feedback) < 5:
        return {"available": False}

    categories = ["clarity", "pace", "examples", "doubts", "engagement", "relevance", "overall"]
    distribution = {}

    for category in categories:
        values = [getattr(f, category) for f in feedback]
        counts = Counter(values)
        distribution[category] = {
            "distribution": dict(counts),
            "mean": round(mean(values), 2),
            "std": round(stdev(values), 2) if len(values) > 1 else 0,
        }

    return {"available": True, "distribution": distribution, "total": len(feedback)}


@router.get("/admin/stats")
def admin_statistics(_: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """Overall system statistics for administrators."""
    total_users = db.scalar(select(func.count(User.id)))
    students = db.scalar(select(func.count(User.id)).where(User.role == "student"))
    teachers = db.scalar(select(func.count(User.id)).where(User.role == "teacher"))
    courses = db.scalar(select(func.count(Assignment.id)))
    total_feedback = db.scalar(select(func.count(Feedback.id)))
    flagged = db.scalar(select(func.count(Feedback.id)).where(Feedback.moderation == "flagged"))

    # Recent activity (last 7 days)
    week_ago = datetime.now().date() - timedelta(days=7)
    recent_feedback = db.scalar(
        select(func.count(Feedback.id)).where(Feedback.day >= week_ago)
    )

    # Average ratings across all feedback
    all_feedback = db.scalars(select(Feedback).where(Feedback.moderation != "removed")).all()
    avg_ratings = {}
    if all_feedback:
        for metric in ["overall", "clarity", "pace", "engagement"]:
            avg_ratings[metric] = round(
                mean(getattr(f, metric) for f in all_feedback), 2
            )

    return {
        "users": {"total": total_users, "students": students, "teachers": teachers},
        "courses": courses,
        "feedback": {
            "total": total_feedback,
            "flagged": flagged,
            "recent_7_days": recent_feedback,
        },
        "average_ratings": avg_ratings,
    }
