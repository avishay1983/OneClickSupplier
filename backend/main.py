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
