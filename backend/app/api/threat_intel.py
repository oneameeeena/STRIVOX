from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, ThreatIntelConfig
from app.schemas.schemas import ThreatIntelLookupRequest, ThreatIntelConfigCreate, ThreatIntelConfigOut
from app.services.threat_intel_service import ThreatIntelService

router = APIRouter()

@router.get("/configs", response_model=List[ThreatIntelConfigOut])
def get_threat_intel_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ThreatIntelConfig).all()

@router.post("/configs", response_model=ThreatIntelConfigOut)
def save_threat_intel_config(
    cfg_in: ThreatIntelConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    provider_name = cfg_in.provider.lower().strip()
    existing = db.query(ThreatIntelConfig).filter(ThreatIntelConfig.provider == provider_name).first()
    
    if existing:
        existing.api_key = cfg_in.api_key
        existing.enabled = cfg_in.enabled
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_cfg = ThreatIntelConfig(
            provider=provider_name,
            api_key=cfg_in.api_key,
            enabled=cfg_in.enabled
        )
        db.add(new_cfg)
        db.commit()
        db.refresh(new_cfg)
        return new_cfg

@router.post("/enrich")
async def enrich_indicator(
    req: ThreatIntelLookupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.indicator or not req.indicator.strip():
        raise HTTPException(status_code=400, detail="Indicator string is required.")
        
    res = await ThreatIntelService.enrich_indicator(
        indicator=req.indicator,
        indicator_type=req.indicator_type,
        db=db
    )
    return res
