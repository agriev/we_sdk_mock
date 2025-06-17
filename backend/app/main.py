from fastapi import FastAPI
from fastapi_admin.app import app as admin_app

from .database import init_db
from .routers import auth, games, payments
from .admin_setup import init_admin

app = FastAPI(title="We Platform Backend")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    await init_admin()

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])

# Health check
@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.mount("/admin", admin_app) 