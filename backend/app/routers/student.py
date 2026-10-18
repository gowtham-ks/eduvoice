from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Enrollment, Issuance, User
from ..security import require_role

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/assignments")
def my_assignments(user: User = Depends(require_role("student")), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Assignment).join(Enrollment, Enrollment.assignment_id == Assignment.id)
        .where(Enrollment.student_id == user.id, Assignment.is_open.is_(True))
    ).all()
    issued = set(db.scalars(select(Issuance.assignment_id).where(Issuance.student_id == user.id)))
    return [
        {
            "assignment_id": a.id,
            "subject": a.subject.name,
            "subject_code": a.subject.code,
            "teacher": a.teacher.name,
            "semester": a.semester,
            "credential_issued": a.id in issued,
        }
        for a in rows
    ]


@router.get("/assignments/{assignment_id}")
def assignment_detail(assignment_id: int, user: User = Depends(require_role("student")),
                      db: Session = Depends(get_db)):
    for a in my_assignments(user, db):
        if a["assignment_id"] == assignment_id:
            return a
    from fastapi import HTTPException
    raise HTTPException(404, "Course not found")
