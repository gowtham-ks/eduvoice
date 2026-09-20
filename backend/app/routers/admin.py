import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Enrollment, Feedback, Subject, Teacher, User
from ..security import hash_password, require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview(_: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    out = []
    for a in db.scalars(select(Assignment)):
        enrolled = db.scalar(select(func.count(Enrollment.id)).where(Enrollment.assignment_id == a.id))
        responses = db.scalar(select(func.count(Feedback.id)).where(Feedback.assignment_id == a.id))
        out.append({"assignment_id": a.id, "subject": a.subject.name, "teacher": a.teacher.name,
                    "semester": a.semester, "enrolled": enrolled, "responses": responses, "is_open": a.is_open})
    return out


@router.get("/moderation")
def flagged(_: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Feedback).where(Feedback.moderation == "flagged")).all()
    return [{"id": r.id, "subject": db.get(Assignment, r.assignment_id).subject.name,
             "went_well": r.went_well, "to_improve": r.to_improve, "flags": r.flags} for r in rows]


class ModerateIn(BaseModel):
    action: Literal["approve", "remove"]


@router.post("/moderation/{feedback_id}")
def moderate(feedback_id: int, body: ModerateIn, _: User = Depends(require_role("admin")),
             db: Session = Depends(get_db)):
    fb = db.get(Feedback, feedback_id)
    if not fb or fb.moderation != "flagged":
        raise HTTPException(404, "Nothing to review for this item")
    fb.moderation = "visible" if body.action == "approve" else "removed"
    db.commit()
    return {"ok": True}


USERNAME = re.compile(r"^[A-Za-z0-9._-]{3,64}$")


class NewUser(BaseModel):
    username: str
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class BulkUsersIn(BaseModel):
    role: Literal["student", "teacher"]
    users: list[NewUser] = Field(min_length=1, max_length=1000)


@router.post("/users")
def bulk_users(body: BulkUsersIn, _: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    """Create student or teacher accounts. Existing usernames are skipped, never overwritten."""
    created, skipped = 0, []
    for u in body.users:
        if not USERNAME.match(u.username) or db.scalar(select(User.id).where(User.username == u.username)):
            skipped.append(u.username)
            continue
        user = User(username=u.username, name=u.name, role=body.role, password_hash=hash_password(u.password))
        db.add(user)
        db.flush()
        if body.role == "teacher":
            db.add(Teacher(name=u.name, user_id=user.id))
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped}


class CourseIn(BaseModel):
    subject_code: str = Field(min_length=1, max_length=20)
    subject_name: str = Field(min_length=1, max_length=120)
    teacher_username: str
    semester: str = Field(min_length=1, max_length=20)
    student_usernames: list[str] = Field(default_factory=list, max_length=2000)
    enroll_all_students: bool = False


@router.post("/courses")
def create_course(body: CourseIn, _: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    teacher_user = db.scalar(select(User).where(User.username == body.teacher_username, User.role == "teacher"))
    teacher = db.scalar(select(Teacher).where(Teacher.user_id == teacher_user.id)) if teacher_user else None
    if not teacher:
        raise HTTPException(404, f"No teacher account named '{body.teacher_username}'")

    subject = db.scalar(select(Subject).where(Subject.code == body.subject_code))
    if not subject:
        subject = Subject(code=body.subject_code, name=body.subject_name)
        db.add(subject)
        db.flush()
    assignment = Assignment(teacher_id=teacher.id, subject_id=subject.id, semester=body.semester)
    db.add(assignment)
    db.flush()

    if body.enroll_all_students:
        students = db.scalars(select(User).where(User.role == "student")).all()
    else:
        students = db.scalars(select(User).where(User.role == "student", User.username.in_(body.student_usernames))).all()
    db.add_all([Enrollment(student_id=s.id, assignment_id=assignment.id) for s in students])
    found = {s.username for s in students}
    missing = [u for u in body.student_usernames if u not in found] if not body.enroll_all_students else []
    db.commit()
    return {"assignment_id": assignment.id, "enrolled": len(students), "unknown_students": missing}


class OpenIn(BaseModel):
    is_open: bool


@router.post("/assignments/{assignment_id}/open")
def set_open(assignment_id: int, body: OpenIn, _: User = Depends(require_role("admin")),
             db: Session = Depends(get_db)):
    a = db.get(Assignment, assignment_id)
    if not a:
        raise HTTPException(404, "Course not found")
    a.is_open = body.is_open
    db.commit()
    return {"ok": True}
