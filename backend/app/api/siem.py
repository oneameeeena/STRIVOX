from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, SIEMConfig, SecurityEvent
from app.schemas.schemas import (
    SIEMConfigCreate,
    SIEMConfigOut,
    SIEMTestRequest,
    SIEMEventCreate,
    SIEMEventOut,
    InvestigationOut
)
from app.services.siem_service import SIEMService

router = APIRouter()

@router.get("/configs", response_model=List[SIEMConfigOut])
def get_siem_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(SIEMConfig).order_by(SIEMConfig.created_at.desc()).all()

@router.post("/configs", response_model=SIEMConfigOut, status_code=status.HTTP_201_CREATED)
def create_siem_config(
    cfg_in: SIEMConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = SIEMConfig(
        provider=cfg_in.provider.lower(),
        name=cfg_in.name,
        api_url=cfg_in.api_url,
        api_key=cfg_in.api_key,
        enabled=cfg_in.enabled
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.post("/test")
async def test_siem_connection(
    req: SIEMTestRequest,
    current_user: User = Depends(get_current_user)
):
    res = await SIEMService.test_connection(req.provider, req.api_url, req.api_key)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message"))
    return res

@router.post("/events", response_model=SIEMEventOut, status_code=status.HTTP_201_CREATED)
async def ingest_siem_event(
    event_in: SIEMEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = await SIEMService.ingest_event(
        db=db,
        source=event_in.source,
        event_type=event_in.event_type,
        severity=event_in.severity,
        raw_data=event_in.raw_data
    )
    return event

@router.post("/events/{event_id}/investigate", response_model=dict)
def investigate_siem_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="SIEM Event not found.")

    inv = SIEMService.create_investigation_from_event(db, current_user.id, event)
    return {"investigation_id": inv.id, "title": inv.title, "status": inv.status}
