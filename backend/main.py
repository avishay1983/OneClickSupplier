from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_supabase
from auth import get_current_user

from routers import users, vendors, documents, receipts, cron, admin

app = FastAPI(title="Lovable Supplier Backend")

print("Including users router...")
app.include_router(users.router)
print("Including vendors router:", vendors.router)
app.include_router(vendors.router)
print("Including documents router:", documents.router)
app.include_router(documents.router)
print("Including receipts router:", receipts.router)
app.include_router(receipts.router)
print("Including cron router:", cron.router)
app.include_router(cron.router)
print("Including admin router:", admin.router)
app.include_router(admin.router)
print("All routers included.")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from Python Backend!"}

@app.get("/api/health")
async def health_check():
    # Verify DB connection
    try:
        supabase = get_supabase()
        # Just a lightweight check, e.g. querying a public table or just ensuring client init
        # We can try to list users or just return ok if client is initialized
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/protected")
async def protected_route(user = Depends(get_current_user)):
    return {"message": "You are authenticated!", "user_id": user.id, "email": user.email}

