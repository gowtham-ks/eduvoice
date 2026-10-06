"""Demo data. Run:  python -m app.seed      (DEV ONLY: passwords are printed and weak)"""
from sqlalchemy import select

from .config import settings
from .db import Base, SessionLocal, engine
from .models import Assignment, Enrollment, Subject, Teacher, User
from .security import hash_password


def seed(db) -> None:
    if db.scalar(select(User.id).limit(1)):
        return
    admin = User(username="admin", name="Admin", role="admin", password_hash=hash_password("admin123"))
    t1 = User(username="kumar", name="Dr. Kumar", role="teacher", password_hash=hash_password("teacher123"))
    t2 = User(username="devi", name="Prof. Devi", role="teacher", password_hash=hash_password("teacher123"))
    students = [User(username=f"s{i:02d}", name=f"Student {i:02d}", role="student",
                     password_hash=hash_password("student123")) for i in range(1, 9)]
    db.add_all([admin, t1, t2, *students])
    db.flush()

    teachers = [Teacher(name=t1.name, user_id=t1.id), Teacher(name=t2.name, user_id=t2.id)]
    subjects = [Subject(code="NS101", name="Network Security"), Subject(code="ML201", name="Machine Learning")]
    db.add_all([*teachers, *subjects])
    db.flush()

    assignments = [Assignment(teacher_id=teachers[0].id, subject_id=subjects[0].id, semester="Sem 5"),
                   Assignment(teacher_id=teachers[1].id, subject_id=subjects[1].id, semester="Sem 5")]
    db.add_all(assignments)
    db.flush()
    db.add_all([Enrollment(student_id=s.id, assignment_id=a.id) for s in students for a in assignments])
    db.commit()


if __name__ == "__main__":
    if settings.is_production:
        raise SystemExit("Refusing to load demo data in production. Use: python -m app.bootstrap init")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    print("Seeded. Logins: admin/admin123, kumar/teacher123, devi/teacher123, s01..s08/student123")
