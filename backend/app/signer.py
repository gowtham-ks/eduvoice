import base64
from functools import lru_cache

from cryptography.hazmat.primitives import serialization

from .blind import BlindSigner, load_or_create_key
from .config import settings


@lru_cache(maxsize=1)
def get_signer() -> BlindSigner:
    """Created on first use so it works on serverless hosts where startup hooks may not run."""
    if settings.signing_key_pem_b64:
        pem = base64.b64decode(settings.signing_key_pem_b64)
        key = serialization.load_pem_private_key(pem, password=None)
    else:
        key = load_or_create_key(settings.signing_key_path)
    return BlindSigner(key)
