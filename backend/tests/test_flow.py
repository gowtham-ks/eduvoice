import math
import secrets

import pytest
from fastapi.testclient import TestClient

from app.blind import fdh
from app.db import SessionLocal
from app.main import app
from app.models import Feedback, Issuance, SpentToken
from app.seed import seed


def blind(message: bytes, n: int, e: int):
    m = fdh(message, n)
    while True:
        r = secrets.randbelow(n - 2) + 2
        if math.gcd(r, n) == 1:
            break
    return (m * pow(r, e, n)) % n, r


def unblind(sb: int, r: int, n: int) -> int:
    return (sb * pow(r, -1, n)) % n


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        with SessionLocal() as db:
            seed(db)
        yield c


def login(username, password):
    c = TestClient(app)
    r = c.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return c


def get_credential(c: TestClient, assignment_id: int):
    key = c.get("/credentials/public-key").json()
    n, e = int(key["n"], 16), int(key["e"], 16)
    nonce = secrets.token_hex(16)
    msg = f"{assignment_id}:{nonce}".encode()
    blinded, r = blind(msg, n, e)
    resp = c.post("/credentials/issue", json={"assignment_id": assignment_id, "blinded": format(blinded, "x")})
    if resp.status_code != 200:
        return resp, None
    sig = unblind(int(resp.json()["signature"], 16), r, n)
    return resp, {"nonce": nonce, "signature": format(sig, "x")}


def payload(cred, assignment_id=1, **extra):
    base = dict(assignment_id=assignment_id, clarity=4, pace=3, examples=5, doubts=4, overall=4,
                went_well="Explains clearly", to_improve="A bit fast", **cred)
    base.update(extra)
    return base


def test_full_anonymous_flow(client):
    s = login("s01", "student123")
    resp, cred = get_credential(s, 1)
    assert resp.status_code == 200

    anon = TestClient(app)  # no cookies at all
    assert anon.post("/feedback", json=payload(cred)).status_code == 201
    # replay is rejected
    assert anon.post("/feedback", json=payload(cred)).status_code == 409
    # same student cannot get a second credential
    assert get_credential(s, 1)[0].status_code == 409


def test_forged_signature_rejected(client):
    anon = TestClient(app)
    bad = {"nonce": secrets.token_hex(16), "signature": "abcdef1234"}
    assert anon.post("/feedback", json=payload(bad)).status_code == 400


def test_credential_is_bound_to_assignment(client):
    s = login("s02", "student123")
    _, cred = get_credential(s, 1)
    anon = TestClient(app)
    assert anon.post("/feedback", json=payload(cred, assignment_id=2)).status_code == 400


def test_role_and_enrollment_checks(client):
    t = login("kumar", "teacher123")
    assert t.get("/student/assignments").status_code == 403
    s = login("s03", "student123")
    assert s.get("/teacher/summary").status_code == 403
    assert s.post("/credentials/issue", json={"assignment_id": 99, "blinded": "abc"}).status_code == 404


def test_no_link_between_identity_and_feedback(client):
    cols = {c.name for c in Feedback.__table__.columns}
    assert not any("student" in c or "user" in c for c in cols)
    assert not any("student" in c or "user" in c for c in (c.name for c in SpentToken.__table__.columns))
    assert "nonce_hash" in {c.name for c in SpentToken.__table__.columns}
    assert "credential" not in " ".join(c.name for c in Issuance.__table__.columns)


def test_min_response_threshold_and_moderation(client):
    teacher = login("kumar", "teacher123")
    anon = TestClient(app)

    def submit_as(user, **extra):
        _, cred = get_credential(login(user, "student123"), 1)
        return anon.post("/feedback", json=payload(cred, **extra))

    # s01 and s02 already submitted / hold credentials above; s02's credential was for assignment 1 but unused.
    summary = teacher.get("/teacher/summary").json()
    ns = next(x for x in summary if x["assignment_id"] == 1)
    assert ns["responses"] == 1 and ns["available"] is False and "ratings" not in ns

    for u in ("s03", "s04", "s05"):
        assert submit_as(u).status_code == 201
    # a comment containing an email gets flagged and hidden
    assert submit_as("s06", went_well="mail me at kid@example.com").status_code == 201

    ns = next(x for x in teacher.get("/teacher/summary").json() if x["assignment_id"] == 1)
    assert ns["responses"] == 5 and ns["available"] is True
    assert ns["ratings"]["clarity"] == 4.0
    assert ns["comments"] is None  # fewer than 10 responses: no free text shown

    admin = login("admin", "admin123")
    flagged = admin.get("/admin/moderation").json()
    assert len(flagged) == 1 and "identifying_info" in flagged[0]["flags"]
    assert admin.post(f"/admin/moderation/{flagged[0]['id']}", json={"action": "remove"}).status_code == 200


def test_admin_can_create_users_and_courses_and_toggle_feedback(client):
    admin = login("admin", "admin123")
    r = admin.post("/admin/users", json={"role": "teacher", "users": [
        {"username": "newteacher", "name": "New Teacher", "password": "teacherpass1"},
        {"username": "bad name!", "name": "Bad", "password": "whatever123"}]})
    assert r.json() == {"created": 1, "skipped": ["bad name!"]}
    admin.post("/admin/users", json={"role": "student", "users": [
        {"username": "newstudent", "name": "New Student", "password": "studentpass1"}]})
    r = admin.post("/admin/courses", json={
        "subject_code": "CS999", "subject_name": "Compilers", "teacher_username": "newteacher",
        "semester": "Sem 6", "student_usernames": ["newstudent", "ghost"]})
    body = r.json()
    assert r.status_code == 200 and body["enrolled"] == 1 and body["unknown_students"] == ["ghost"]

    s = login("newstudent", "studentpass1")
    assert [c["subject_code"] for c in s.get("/student/assignments").json()] == ["CS999"]
    assert admin.post(f"/admin/assignments/{body['assignment_id']}/open", json={"is_open": False}).status_code == 200
    assert s.get("/student/assignments").json() == []
    assert admin.post("/admin/courses", json={
        "subject_code": "X", "subject_name": "X", "teacher_username": "nobody", "semester": "S"}).status_code == 404


def test_admin_endpoints_require_admin(client):
    s = login("s07", "student123")
    assert s.post("/admin/users", json={"role": "student", "users": []}).status_code in (403, 422)
    assert s.get("/admin/overview").status_code == 403


def test_change_password(client):
    c = login("s08", "student123")
    assert c.post("/auth/change-password", json={"current_password": "wrong", "new_password": "newpassword1"}).status_code == 400
    assert c.post("/auth/change-password", json={"current_password": "student123", "new_password": "newpassword1"}).status_code == 200
    assert TestClient(app).post("/auth/login", json={"username": "s08", "password": "student123"}).status_code == 401
    assert TestClient(app).post("/auth/login", json={"username": "s08", "password": "newpassword1"}).status_code == 200


def test_production_config_is_validated():
    from app.config import Settings
    bad = Settings(environment="production", database_url="sqlite:///x.db")
    with pytest.raises(RuntimeError):
        bad.check_production()
    good = Settings(environment="production", database_url="postgres://u:p@h/db", jwt_secret="x" * 40,
                    signing_key_pem_b64="abc", cookie_secure=True)
    good.check_production()
    assert good.sqlalchemy_url.startswith("postgresql+psycopg://")


def test_account_locks_after_repeated_failures(client):
    c = TestClient(app)
    for _ in range(5):
        assert c.post("/auth/login", json={"username": "kumar", "password": "nope"}).status_code == 401
    # even the right password is refused while locked
    assert c.post("/auth/login", json={"username": "kumar", "password": "teacher123"}).status_code == 429
