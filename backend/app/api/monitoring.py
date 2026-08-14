from typing import List, Dict, Any
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, SecurityEvent, Investigation
from app.schemas.schemas import SIEMEventOut
from app.services.event_bus import event_bus

router = APIRouter()

def _sync_investigations_to_events(db: Session):
    """Synthesize SecurityEvent rows for any existing investigations that lack one."""
    invs = db.query(Investigation).all()
    existing_inv_ids = {se.investigation_id for se in db.query(SecurityEvent).all() if se.investigation_id}
    
    for inv in invs:
        if inv.id not in existing_inv_ids:
            risk = 95 if inv.severity == "Critical" else (80 if inv.severity == "High" else (55 if inv.severity == "Medium" else 25))
            sec_event = SecurityEvent(
                source=inv.siem_source or "Security Investigation",
                event_type=inv.title or "Security Event",
                severity=inv.severity or "Low",
                status="Investigated" if inv.status == "Completed" else "New",
                raw_data=f"Investigation #{inv.id}: {inv.title}",
                investigation_id=inv.id,
                risk_score=risk,
                timestamp=inv.created_at
            )
            db.add(sec_event)
    db.commit()

@router.get("/events", response_model=List[SIEMEventOut])
def get_live_monitoring_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return latest security events for the live monitoring feed."""
    _sync_investigations_to_events(db)
    return (
        db.query(SecurityEvent)
        .order_by(SecurityEvent.timestamp.desc())
        .limit(limit)
        .all()
    )

@router.get("/stats")
def get_monitoring_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return backend-calculated real-time security telemetry metrics."""
    _sync_investigations_to_events(db)
    events = db.query(SecurityEvent).all()
    invs = db.query(Investigation).all()

    return {
        "total_events": len(events),
        "critical_count": sum(1 for e in events if e.severity == "Critical"),
        "high_count": sum(1 for e in events if e.severity == "High"),
        "medium_count": sum(1 for e in events if e.severity == "Medium"),
        "low_count": sum(1 for e in events if e.severity == "Low"),
        "active_investigations": sum(1 for i in invs if i.status in ("Analyzing", "Pending", "New"))
    }

@router.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    """WebSocket connection endpoint for live event streaming."""
    print("[Monitoring] WebSocket Client connected")
    await event_bus.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("[Monitoring] WebSocket Client disconnected")
        event_bus.disconnect(websocket)
