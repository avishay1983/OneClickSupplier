"""
JWT Auth module — replaces Supabase Auth.

Handles:
- Password hashing (bcrypt)
- JWT token creation/verification
- get_current_user dependency for FastAPI

When Bituach Yashir provides real auth, replace this module.
"""

import os
import hashlib
import hmac
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Use PyJWT if available, otherwise use a simple implementation
try:
    import jwt as pyjwt
    HAS_PYJWT = True
except ImportError:
    HAS_PYJWT = False

# --- Configuration ---
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-" + secrets.token_hex(16))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))

# --- Password Hashing (simple SHA-256 + salt, no bcrypt dependency) ---

def hash_password(password: str) -> str:
    """Hash a password with a random salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{base64.b64encode(pw_hash).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its stored hash."""
    try:
        salt, pw_hash = stored_hash.split(":", 1)
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(
            base64.b64encode(new_hash).decode(),
            pw_hash
        )
    except Exception:
        return False


# --- JWT Token ---

def _encode_jwt(payload: dict) -> str:
    """Encode a JWT token."""
    if HAS_PYJWT:
        return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    else:
        # Simple fallback using base64 + HMAC (NOT production-grade)
        import json
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, default=str).encode()).rstrip(b"=").decode()
        signing_input = f"{header}.{payload_b64}"
        signature = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        return f"{signing_input}.{signature}"


def _decode_jwt(token: str) -> dict:
    """Decode and verify a JWT token."""
    if HAS_PYJWT:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    else:
        import json
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token")
        header, payload_b64, signature = parts
        # Verify signature
        signing_input = f"{header}.{payload_b64}"
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Invalid token signature")
        # Decode payload
        padding = 4 - len(payload_b64) % 4
        payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        # Check expiration
        if "exp" in payload:
            exp = datetime.fromisoformat(payload["exp"]) if isinstance(payload["exp"], str) else datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            if exp < datetime.now(timezone.utc):
                raise ValueError("Token expired")
        return payload


def create_access_token(user_id: str, email: str, extra: dict = None) -> str:
    """Create a JWT access token for a user."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRATION_HOURS)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return _encode_jwt(payload)


def decode_access_token(token: str) -> dict:
    """Decode an access token and return the payload."""
    try:
        return _decode_jwt(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# --- FastAPI Dependencies ---

security = HTTPBearer(auto_error=False)


class UserInfo:
    """Simple user object to mimic Supabase user response."""
    def __init__(self, id: str, email: str, **kwargs):
        self.id = id
        self.email = email
        for k, v in kwargs.items():
            setattr(self, k, v)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None
) -> UserInfo:
    """
    Verifies JWT token from Authorization header or cookie.
    Returns UserInfo if valid, raises 401 if not.
    Replaces the old Supabase-based get_current_user.
    """
    token = None

    # Try Authorization header first
    if credentials:
        token = credentials.credentials

    # Try cookie fallback
    if not token and request:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    return UserInfo(
        id=payload.get("sub", ""),
        email=payload.get("email", ""),
    )
