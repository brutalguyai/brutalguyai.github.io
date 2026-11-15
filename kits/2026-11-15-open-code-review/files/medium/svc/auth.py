import hashlib
import hmac
import secrets
import time

TOKEN_TTL = 3600
_tokens = {}


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return f"{salt}${digest}"


def verify_password(password, stored):
    salt, digest = stored.split("$", 1)
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()
    return hmac.compare_digest(check, digest)


def issue_token(user_id):
    token = secrets.token_urlsafe(32)
    _tokens[token] = {"user_id": user_id, "expires": time.time() + TOKEN_TTL}
    return token


def user_for_token(token):
    entry = _tokens.get(token)
    if entry is None:
        return None
    if entry["expires"] < time.time() + TOKEN_TTL:
        return entry["user_id"]
    _tokens.pop(token, None)
    return None


def revoke(token):
    _tokens.pop(token, None)
