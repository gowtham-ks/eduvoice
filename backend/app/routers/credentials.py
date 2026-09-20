"""Eligibility check + blind signing. This is the ONLY place identity and credentials meet,
and the server signs a blinded value, so it never learns the credential."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment, Enrollment, Issuance, User
from ..signer import get_signer
from ..security import rate_limit, require_role

router = APIRouter(prefix="/credentials", tags=["credentials"])


class IssueIn(BaseModel):
    assignment_id: int
    blinded: str = Field(pattern=r"^[0-9a-f]+$", max_length=1024)  # hex


@router.get("/public-key")
def public_key(request: Request):
    s = get_signer()
    return {"n": format(s.n, "x"), "e": format(s.e, "x")}


@router.post("/issue", dependencies=[Depends(rate_limit("issue", 30, 60))])
def issue(body: IssueIn, request: Request, user: User = Depends(require_role("student")),
          db: Session = Depends(get_db)):
    signer = get_signer()
    blinded = int(body.blinded, 16)
    if not (1 < blinded < signer.n):
        raise HTTPException(400, "Invalid credential request")

    assignment = db.get(Assignment, body.assignment_id)
    if not assignment or not assignment.is_open:
        raise HTTPException(404, "Feedback is not open for this course")
    enrolled = db.scalar(select(Enrollment.id).where(
        Enrollment.student_id == user.id, Enrollment.assignment_id == assignment.id))
    if not enrolled:
        raise HTTPException(403, "You are not enrolled in this course")

    db.add(Issuance(student_id=user.id, assignment_id=assignment.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You have already received a feedback credential for this course")

    return {"signature": format(signer.sign_blinded(blinded), "x")}
