from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import User
from ..security import (COOKIE_NAME, create_session_token, get_current_user, hash_password, rate_limit,
                        verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])
_DUMMY_HASH = hash_password("dummy-password")  # keeps login timing similar for unknown users


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


MAX_FAILED = 5
LOCK_MINUTES = 15


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC, consistent across SQLite/Postgres


@router.post("/login", dependencies=[Depends(rate_limit("login", 10, 60))])
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    if user and user.locked_until and user.locked_until > _now():
        raise HTTPException(429, f"Too many failed attempts. Try again in {LOCK_MINUTES} minutes.")
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if not user or not ok:
        if user:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= MAX_FAILED:
                user.locked_until = _now() + timedelta(minutes=LOCK_MINUTES)
                user.failed_logins = 0
            db.commit()
        raise HTTPException(401, "Username or password is incorrect")
    if user.failed_logins or user.locked_until:
        user.failed_logins, user.locked_until = 0, None
        db.commit()
    response.set_cookie(
        COOKIE_NAME, create_session_token(user), httponly=True, samesite="lax",
        secure=settings.cookie_secure, max_age=settings.jwt_expire_minutes * 60, path="/",
    )
    return {"name": user.name, "role": user.role}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"name": user.name, "role": user.role}


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)




@router.post("/change-password", dependencies=[Depends(rate_limit("pw", 10, 60))])
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Your current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


