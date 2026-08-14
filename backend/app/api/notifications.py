from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, NotificationConfig, InAppNotification
from app.schemas.schemas import NotificationConfigCreate, NotificationConfigOut, InAppNotificationOut
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/config", response_model=Optional[NotificationConfigOut])
def get_notification_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(NotificationConfig).filter(NotificationConfig.user_id == current_user.id).first()

@router.post("/config", response_model=NotificationConfigOut)
def save_notification_config(
    cfg_in: NotificationConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(NotificationConfig).filter(NotificationConfig.user_id == current_user.id).first()
    if existing:
        existing.smtp_host = cfg_in.smtp_host
        existing.smtp_port = cfg_in.smtp_port
        existing.smtp_user = cfg_in.smtp_user
        if cfg_in.smtp_password: # Only update password if provided
            existing.smtp_password = cfg_in.smtp_password
        existing.sender_email = cfg_in.sender_email
        existing.use_tls = cfg_in.use_tls
        existing.notify_on_critical = cfg_in.notify_on_critical
        existing.notify_on_assigned = cfg_in.notify_on_assigned
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_cfg = NotificationConfig(
            user_id=current_user.id,
            smtp_host=cfg_in.smtp_host,
            smtp_port=cfg_in.smtp_port,
            smtp_user=cfg_in.smtp_user,
            smtp_password=cfg_in.smtp_password,
            sender_email=cfg_in.sender_email,
            use_tls=cfg_in.use_tls,
            notify_on_critical=cfg_in.notify_on_critical,
            notify_on_assigned=cfg_in.notify_on_assigned
        )
        db.add(new_cfg)
        db.commit()
        db.refresh(new_cfg)
        return new_cfg

@router.post("/test")
def test_email_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cfg = db.query(NotificationConfig).filter(NotificationConfig.user_id == current_user.id).first()
    if not cfg or not cfg.smtp_host:
        raise HTTPException(status_code=400, detail="SMTP server is not configured yet.")

    success = NotificationService.send_email(
        config=cfg,
        to_email=current_user.email,
        subject="[STRIVOX Test] Notification Connection Verified",
        body_text=f"Hello {current_user.name},\n\nYour STRIVOX email notification configuration has been successfully tested and verified!"
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to send test email. Please check your SMTP credentials and host settings.")
    return {"message": "Test email sent successfully."}

@router.get("", response_model=List[InAppNotificationOut])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(InAppNotification)
        .filter(InAppNotification.user_id == current_user.id)
        .order_by(InAppNotification.created_at.desc())
        .limit(30)
        .all()
    )

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = (
        db.query(InAppNotification)
        .filter(InAppNotification.id == notification_id, InAppNotification.user_id == current_user.id)
        .first()
    )
    if notif:
        notif.read = 1
        db.commit()
    return {"status": "ok"}
