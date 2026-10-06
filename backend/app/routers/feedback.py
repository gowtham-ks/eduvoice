"""Anonymous submission. Deliberately has NO session/cookie dependency: authorisation is
the blind-signed credential alone, so nothing here can be tied to a logged-in student."""
import hashlib
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import ml
from ..db import get_db
from ..models import Assignment, Feedback, SpentToken
from ..signer import get_signer
from ..security import rate_limit

router = APIRouter(tags=["feedback"])
Rating = Field(ge=1, le=5)


class FeedbackIn(BaseModel):
    assignment_id: int
    nonce: str = Field(pattern=r"^[0-9a-f]{32,64}$")
    signature: str = Field(pattern=r"^[0-9a-f]+$", max_length=1024)
    clarity: int = Rating
    pace: int = Rating
    examples: int = Rating
    doubts: int = Rating
    overall: int = Rating
    went_well: str = Field("", max_length=1000)
    to_improve: str = Field("", max_length=1000)


@router.post("/feedback", status_code=201, dependencies=[Depends(rate_limit("feedback", 30, 60))])
def submit(body: FeedbackIn, request: Request, db: Session = Depends(get_db)):
    signer = get_signer()
    message = f"{body.assignment_id}:{body.nonce}".encode()
    if not signer.verify(message, int(body.signature, 16)):
        raise HTTPException(400, "This feedback credential is not valid")

    assignment = db.get(Assignment, body.assignment_id)
    if not assignment or not assignment.is_open:
        raise HTTPException(404, "Feedback is closed for this course")

    a1, a2 = ml.analyze(body.went_well), ml.analyze(body.to_improve)
    flags = sorted(set(a1["flags"] + a2["flags"]))
    sentiments = {a1["sentiment"], a2["sentiment"]} - {"neutral"}
    sentiment = "mixed" if len(sentiments) > 1 else (sentiments.pop() if sentiments else "neutral")

    db.add(SpentToken(nonce_hash=hashlib.sha256(body.nonce.encode()).hexdigest()))
    db.add(Feedback(
        assignment_id=assignment.id, clarity=body.clarity, pace=body.pace, examples=body.examples,
        doubts=body.doubts, overall=body.overall, went_well=body.went_well.strip(),
        to_improve=body.to_improve.strip(), sentiment=sentiment, flags=flags,
        moderation="flagged" if flags else "visible", day=date.today(),
    ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This feedback credential has already been used")
    return {"ok": True}
