import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User

_ph = PasswordHasher()
COOKIE_NAME = "eduvoice_session"


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, password)
    except VerifyMismatchError:
        return False


def create_session_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not signed in")
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired. Sign in again.")
    user = db.get(User, int(data["sub"]))
    if not user:
        raise HTTPException(401, "Account not found")
    return user


def require_role(*roles: str):
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You do not have access to this page")
        return user
    return dep


# --- tiny in-memory rate limiter (use Redis when you run more than one process) ---
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(key_prefix: str, limit: int, window_s: int):
    def dep(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{ip}"
        now = time.monotonic()
        q = _hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many requests. Try again in a minute.")
        q.append(now)
    return dep
