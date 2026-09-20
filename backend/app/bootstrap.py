"""
One-time setup commands.

  python -m app.bootstrap genkey    print a new signing key (put it in SIGNING_KEY_PEM_B64)
  python -m app.bootstrap init      create tables and the first admin account

Run `init` against your production database from your own machine, e.g.
  DATABASE_URL="postgresql://..." ADMIN_USERNAME=admin python -m app.bootstrap init
The admin password is prompted (or read from ADMIN_PASSWORD).
"""
import base64
import getpass
import os
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import select

from .db import Base, SessionLocal, engine
from .models import User
from .security import hash_password


def genkey() -> None:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption())
    print(base64.b64encode(pem).decode())
    print("\nStore this as SIGNING_KEY_PEM_B64 in your host's environment variables.", file=sys.stderr)
    print("Never commit it. If it is lost or replaced, unspent credentials stop working.", file=sys.stderr)


def init() -> None:
    Base.metadata.create_all(engine)
    username = os.environ.get("ADMIN_USERNAME") or input("Admin username: ").strip()
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.username == username)):
            print(f"Tables are ready. User '{username}' already exists; nothing to create.")
            return
        password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Admin password (min 12 chars): ")
        if len(password) < 12:
            sys.exit("Password must be at least 12 characters.")
        db.add(User(username=username, name="Administrator", role="admin", password_hash=hash_password(password)))
        db.commit()
    print(f"Tables are ready and admin '{username}' was created.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "genkey":
        genkey()
    elif cmd == "init":
        init()
    else:
        sys.exit(__doc__)
