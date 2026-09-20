"""
Database schema.

PRIVACY DESIGN: there is deliberately NO foreign key between the identity tables
(User, Enrollment, Issuance) and the feedback tables (Feedback, SpentToken).
`Issuance` records that a student received a credential for an assignment
(needed to stop double issuance) but never stores the credential itself, which
the server only ever sees in blinded form.
"""
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(16))  # student | teacher | admin
    password_hash: Mapped[str] = mapped_column(String(255))
    # Brute-force protection that works across serverless instances (stored per account, not per IP)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Teacher(Base):
    __tablename__ = "teachers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))


class Assignment(Base):
    """A teacher teaching a subject in a semester. Feedback is given per assignment."""
    __tablename__ = "assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    semester: Mapped[str] = mapped_column(String(20))
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)

    teacher: Mapped[Teacher] = relationship()
    subject: Mapped[Subject] = relationship()


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "assignment_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id"))


class Issuance(Base):
    """Who has already obtained a credential (NOT which credential)."""
    __tablename__ = "issuances"
    __table_args__ = (UniqueConstraint("student_id", "assignment_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id"))


class SpentToken(Base):
    """Hash of each used credential nonce; prevents replay. Not linked to any user."""
    __tablename__ = "spent_tokens"
    nonce_hash: Mapped[str] = mapped_column(String(64), primary_key=True)


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id"), index=True)
    clarity: Mapped[int] = mapped_column(Integer)
    pace: Mapped[int] = mapped_column(Integer)
    examples: Mapped[int] = mapped_column(Integer)
    doubts: Mapped[int] = mapped_column(Integer)
    overall: Mapped[int] = mapped_column(Integer)
    went_well: Mapped[str] = mapped_column(Text, default="")
    to_improve: Mapped[str] = mapped_column(Text, default="")
    sentiment: Mapped[str] = mapped_column(String(16), default="neutral")
    flags: Mapped[list] = mapped_column(JSON, default=list)
    # visible | flagged | removed  (flagged comments are hidden until an admin approves)
    moderation: Mapped[str] = mapped_column(String(16), default="visible")
    # Date only, on purpose: precise timestamps make timing-correlation attacks easier.
    day: Mapped[date] = mapped_column(Date)
