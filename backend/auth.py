from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_supabase

# Security scheme (Bearer token)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token using Supabase Auth.
    Returns the user functionality if valid, raises 401 if not.
    """
    token = credentials.credentials
    supabase = get_supabase()

    try:
        # Verify token by getting the user.
        # This calls the Supabase GoTrue API to validation the session.
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_response.user

    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
