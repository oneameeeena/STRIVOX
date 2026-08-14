from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, Alert, Investigation, Evidence
from app.schemas.schemas import AlertOut, AlertStatusUpdate

router = APIRouter()

@router.get("", response_model=List[AlertOut])
def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    return query.order_by(Alert.created_at.desc()).all()

@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert_status(
    alert_id: int,
    status_update: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.status = status_update.status
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/investigate")
def convert_alert_to_investigation(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    if alert.investigation_id:
        return {"investigation_id": alert.investigation_id, "message": "Investigation already exists for this alert."}

    # Create new investigation from alert details
    inv = Investigation(
        user_id=current_user.id,
        title=f"Alert Escalation: {alert.title}",
        status="Pending",
        severity=alert.severity
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    evidence = Evidence(
        investigation_id=inv.id,
        file_name=f"alert_{alert.id}.log",
        content=f"[SECURITY ALERT INGESTION]\nTitle: {alert.title}\nSeverity: {alert.severity}\nSource: {alert.source}\nDetails:\n{alert.details or 'Suspicious alert triggered'}"
    )
    db.add(evidence)

    alert.investigation_id = inv.id
    alert.status = "Investigating"
    db.commit()

    return {"investigation_id": inv.id, "title": inv.title, "status": inv.status}
