"""
Minimal Google OAuth 2.0 (authorization code flow), using only the standard
library — no new dependency for something this small. Verifies the user's
identity via Google's userinfo endpoint rather than parsing the id_token
ourselves, which avoids needing a JWKS/signature-verification library.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

from .config import settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def authorize_url(state: str) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"


class GoogleAuthError(Exception):
    pass


def exchange_code(code: str) -> dict:
    """Trades an authorization code for a Google profile: {email, name}."""
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data), timeout=10) as r:
            token = json.loads(r.read())
        req = urllib.request.Request(USERINFO_URL, headers={"Authorization": f"Bearer {token['access_token']}"})
        with urllib.request.urlopen(req, timeout=10) as r:
            profile = json.loads(r.read())
    except (urllib.error.URLError, KeyError, json.JSONDecodeError) as e:
        raise GoogleAuthError("Could not verify your Google account") from e
    if not profile.get("email") or not profile.get("email_verified"):
        raise GoogleAuthError("Your Google account has no verified email")
    return {"email": profile["email"].lower(), "name": profile.get("name") or profile["email"].split("@")[0]}
