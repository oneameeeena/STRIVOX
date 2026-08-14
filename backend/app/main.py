from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import Base, engine, auto_migrate_db
from app.api import (
    auth,
    investigations,
    analysis,
    siem,
    monitoring,
    alerts,
    collaboration,
    threat_intel,
    notifications,
    screenshot
)

# Create all database tables on startup
Base.metadata.create_all(bind=engine)
auto_migrate_db()

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# CORS - allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,            prefix="/api/auth",            tags=["auth"])
app.include_router(investigations.router,  prefix="/api",                  tags=["investigations"])
app.include_router(analysis.router,        prefix="/api",                  tags=["analysis"])
app.include_router(siem.router,            prefix="/api/siem",            tags=["siem"])
app.include_router(monitoring.router,      prefix="/api/monitoring",      tags=["monitoring"])
app.include_router(alerts.router,          prefix="/api/alerts",          tags=["alerts"])
app.include_router(collaboration.router,   prefix="/api/collaboration",   tags=["collaboration"])
app.include_router(threat_intel.router,    prefix="/api/threat-intel",    tags=["threat-intel"])
app.include_router(notifications.router,   prefix="/api/notifications",   tags=["notifications"])
app.include_router(screenshot.router,      prefix="/api",                  tags=["screenshot"])

@app.get("/")
def root():
    return {"message": f"{settings.PROJECT_NAME} API is running"}
