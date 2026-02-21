from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import get_supabase
from auth import get_current_user
import os
from pathlib import Path

from routers import users, vendors, documents, receipts, cron, admin

app = FastAPI(title="Lovable Supplier Backend")

# Include all routers
app.include_router(users.router)
app.include_router(vendors.router)
app.include_router(documents.router)
app.include_router(receipts.router)
app.include_router(cron.router)
app.include_router(admin.router)
print("All routers included.")

# Configure CORS
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:8080")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    try:
        supabase = get_supabase()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/test-email")
async def test_email():
    """Temporary endpoint to diagnose email sending issues on Render."""
    import traceback
    import socket
    import ssl
    
    result = {
        "gmail_user_set": bool(os.environ.get("GMAIL_USER")),
        "gmail_password_set": bool(os.environ.get("GMAIL_APP_PASSWORD")),
        "gmail_user_value": (os.environ.get("GMAIL_USER") or "")[:10] + "...",
        "gmail_password_length": len(os.environ.get("GMAIL_APP_PASSWORD") or ""),
    }
    
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")
    
    # Resolve to IPv4
    try:
        ipv4_results = socket.getaddrinfo("smtp.gmail.com", None, socket.AF_INET)
        ipv4_addr = ipv4_results[0][4][0] if ipv4_results else "FAILED"
        result["ipv4_resolved"] = ipv4_addr
    except Exception as e:
        result["ipv4_resolved"] = f"ERROR: {e}"
        ipv4_addr = "smtp.gmail.com"
    
    if gmail_user and gmail_password:
        # Test 1: SSL port 465 with IPv4
        try:
            import smtplib
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(ipv4_addr, 465, timeout=10, context=context) as server:
                server.login(gmail_user, gmail_password)
                result["ssl_465"] = "SUCCESS"
        except Exception as e:
            result["ssl_465"] = f"FAILED: {str(e)}"
        
        # Test 2: STARTTLS port 587 with IPv4
        try:
            import smtplib
            context = ssl.create_default_context()
            with smtplib.SMTP(ipv4_addr, 587, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(gmail_user, gmail_password)
                result["starttls_587"] = "SUCCESS"
        except Exception as e:
            result["starttls_587"] = f"FAILED: {str(e)}"
    else:
        result["smtp_login"] = "SKIPPED - missing credentials"
    
    return result


@app.get("/api/protected")
async def protected_route(user = Depends(get_current_user)):
    return {"message": "You are authenticated!", "user_id": user.id, "email": user.email}

# --- Serve React Frontend (Static Files) ---
# In production, the React app is built to ../dist/
# FastAPI serves it as static files

DIST_DIR = Path(__file__).parent.parent / "dist"

if DIST_DIR.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")
    
    # Serve other static files from dist root (favicon, etc.)
    @app.get("/images/{file_path:path}")
    async def serve_images(file_path: str):
        file = DIST_DIR / "images" / file_path
        if file.exists():
            return FileResponse(str(file))
        return FileResponse(str(DIST_DIR / "index.html"))

    # Catch-all route: serve index.html for SPA routing
    # This MUST be the last route defined
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
        
        # Try to serve the exact file first
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        
        # Otherwise serve index.html (SPA routing)
        return FileResponse(str(DIST_DIR / "index.html"))
    
    print(f"Serving React frontend from {DIST_DIR}")
else:
    @app.get("/")
    async def root():
        return {"message": "API is running. Frontend not built yet (run 'npm run build' first)."}
    print(f"No dist/ directory found at {DIST_DIR}. API-only mode.")

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
