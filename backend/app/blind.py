"""
RSA blind signatures (Chaum), used for anonymous one-time feedback credentials.

Flow
  1. Client picks a random nonce and forms message  m = "<assignment_id>:<nonce>".
  2. Client blinds  H(m)  with a random factor r and sends the blinded value while
     logged in. The server checks eligibility and signs it WITHOUT seeing m.
  3. Client unblinds the signature. (m, signature) is now a valid credential that
     the server cannot link to the student who requested it.
  4. Client submits feedback with (m, signature) and NO session.

This is an educational implementation (full-domain-hash + textbook RSA blinding).
For production, prefer RFC 9474 (RSABSSA) via a vetted library.
"""
import hashlib
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def fdh(message: bytes, n: int) -> int:
    """Full-domain hash into [0, n). Must match frontend/lib/blind.ts."""
    k = (n.bit_length() - 1) // 8  # bytes, so the result is always < n
    out = b""
    counter = 0
    while len(out) < k:
        out += hashlib.sha256(counter.to_bytes(4, "big") + message).digest()
        counter += 1
    return int.from_bytes(out[:k], "big")


class BlindSigner:
    def __init__(self, key: rsa.RSAPrivateKey):
        priv = key.private_numbers()
        self.n = priv.public_numbers.n
        self.e = priv.public_numbers.e
        self._d = priv.d

    def sign_blinded(self, blinded: int) -> int:
        if not (1 < blinded < self.n):
            raise ValueError("blinded value out of range")
        return pow(blinded, self._d, self.n)

    def verify(self, message: bytes, signature: int) -> bool:
        if not (0 < signature < self.n):
            return False
        return pow(signature, self.e, self.n) == fdh(message, self.n)


def load_or_create_key(path: str) -> rsa.RSAPrivateKey:
    if os.path.exists(path):
        with open(path, "rb") as f:
            return serialization.load_pem_private_key(f.read(), password=None)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(pem)
    return key
