"""
Auth Router — replaces Supabase Auth endpoints.

Endpoints:
- POST /api/auth/signup — register new user
- POST /api/auth/login — sign in, return JWT
- POST /api/auth/logout — sign out (clear cookie)
- GET  /api/auth/me — get current user info
- POST /api/auth/reset-password — request password reset
"""

from fastapi import APIRouter, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid

from db import get_db
from auth.jwt_auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    UserInfo,
)
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Request/Response Models ---

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class AuthResponse(BaseModel):
    success: bool
    message: str = ""
    access_token: Optional[str] = None
    user: Optional[dict] = None


# --- Endpoints ---

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Register a new user. Saves to users.json + profiles.json."""
    db = get_db()

    # Check if email already exists
    existing = db.table("users").select("id").eq("email", request.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())

    # Create user record
    user_data = {
        "id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "created_at": now,
        "updated_at": now,
    }
    db.table("users").insert(user_data).execute()

    # Create profile record
    profile_data = {
        "id": user_id,
        "email": request.email,
        "full_name": request.full_name or "",
        "is_approved": False,
        "created_at": now,
        "updated_at": now,
    }
    db.table("profiles").insert(profile_data).execute()

    # Generate token
    token = create_access_token(user_id, request.email)

    return AuthResponse(
        success=True,
        message="User registered successfully",
        access_token=token,
        user={"id": user_id, "email": request.email, "full_name": request.full_name}
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response):
    """Sign in with email/password. Returns JWT token."""
    db = get_db()

    # Find user
    result = db.table("users").select("*").eq("email", request.email).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user = result.data[0]

    # Verify password
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Generate token
    token = create_access_token(user["id"], user["email"])

    # Set cookie too (for browser clients)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,  # 24 hours
    )

    # Get profile info
    profile_result = db.table("profiles").select("*").eq("id", user["id"]).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    # Get user roles
    roles_result = db.table("user_roles").select("role").eq("user_id", user["id"]).execute()
    roles = [r["role"] for r in (roles_result.data or [])]

    return AuthResponse(
        success=True,
        message="Login successful",
        access_token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "full_name": profile.get("full_name", ""),
            "is_approved": profile.get("is_approved", False),
            "roles": roles,
        }
    )


@router.post("/logout")
async def logout(response: Response):
    """Sign out — clears the access token cookie."""
    response.delete_cookie(key="access_token")
    return {"success": True, "message": "Logged out"}


@router.get("/me")
async def get_me(user: UserInfo = Depends(get_current_user)):
    """Get current user info from JWT token."""
    db = get_db()

    # Get profile
    profile_result = db.table("profiles").select("*").eq("id", user.id).execute()
    profile = profile_result.data[0] if profile_result.data else {}

    # Get roles
    roles_result = db.table("user_roles").select("role").eq("user_id", user.id).execute()
    roles = [r["role"] for r in (roles_result.data or [])]

    return {
        "id": user.id,
        "email": user.email,
        "full_name": profile.get("full_name", ""),
        "is_approved": profile.get("is_approved", False),
        "roles": roles,
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Request password reset.
    In a real system this sends an email with a reset link.
    For now, we just acknowledge the request.
    """
    db = get_db()

    # Check if user exists
    result = db.table("users").select("id").eq("email", request.email).execute()
    
    # Always return success to avoid email enumeration
    # In production, send a reset email if user exists
    if result.data:
        print(f"Password reset requested for {request.email}")
        # TODO: Send reset email with token
    
    return {
        "success": True,
        "message": "If this email exists, a reset link will be sent"
    }
