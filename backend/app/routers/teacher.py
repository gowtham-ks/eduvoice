import random
from collections import Counter
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ml
from ..config import settings
from ..db import get_db
from ..models import Assignment, Feedback, Teacher, User
from ..security import require_role

router = APIRouter(prefix="/teacher", tags=["teacher"])


@router.get("/summary")
def summary(user: User = Depends(require_role("teacher")), db: Session = Depends(get_db)):
    teacher = db.scalar(select(Teacher).where(Teacher.user_id == user.id))
    if not teacher:
        raise HTTPException(404, "No teacher profile is linked to this account")

    out = []
    for a in db.scalars(select(Assignment).where(Assignment.teacher_id == teacher.id)):
        rows = db.scalars(select(Feedback).where(
            Feedback.assignment_id == a.id, Feedback.moderation != "removed")).all()
        item = {"assignment_id": a.id, "subject": a.subject.name, "subject_code": a.subject.code,
                "semester": a.semester, "responses": len(rows), "needed": settings.min_responses}
        if len(rows) < settings.min_responses:
            item["available"] = False  # privacy: too few responses to show anything
            out.append(item)
            continue

        item["available"] = True
        item["ratings"] = {
            k: round(mean(getattr(r, k) for r in rows), 2)
            for k in ("overall", "clarity", "pace", "examples", "doubts")
        }
        item["sentiment"] = dict(Counter(r.sentiment for r in rows))
        approved = [r for r in rows if r.moderation == "visible"]
        texts = [t for r in approved for t in (r.went_well, r.to_improve) if t]
        item["topics"] = ml.topic_counts(texts)
        if len(rows) >= settings.min_comments_visible:
            comments = [{"went_well": r.went_well, "to_improve": r.to_improve}
                        for r in approved if r.went_well or r.to_improve]
            random.shuffle(comments)  # no ordering that could hint at who wrote what
            item["comments"] = comments
        else:
            item["comments"] = None
            item["comments_needed"] = settings.min_comments_visible
        out.append(item)
    return out
