import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["ENVIRONMENT"] = "development"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SIGNING_KEY_PATH"] = f"{_tmp}/key.pem"
os.environ["SIGNING_KEY_PEM_B64"] = ""

import pytest


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app import security
    security._hits.clear()
    yield
