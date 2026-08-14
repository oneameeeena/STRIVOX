from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, Investigation, InvestigationComment, InvestigationActivity
from app.schemas.schemas import UserBrief, CommentCreate, CommentOut, ActivityOut, AssignUserRequest, InvestigationOut
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/users", response_model=List[UserBrief])
def get_team_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all team analysts available for assignment or collaboration."""
    return db.query(User).all()

@router.post("/investigations/{investigation_id}/assign", response_model=InvestigationOut)
def assign_investigation(
    investigation_id: int,
    req: AssignUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found.")

    old_assignee_id = inv.assigned_user_id
    inv.assigned_user_id = req.assigned_user_id

    # Record activity audit log
    assignee_name = "Unassigned"
    if req.assigned_user_id:
        target_user = db.query(User).filter(User.id == req.assigned_user_id).first()
        if target_user:
            assignee_name = target_user.name
            NotificationService.notify_user(
                db=db,
                user_id=target_user.id,
                title="Investigation Assigned",
                message=f"Investigation #{inv.id} '{inv.title}' has been assigned to you by {current_user.name}."
            )

    activity = InvestigationActivity(
        investigation_id=inv.id,
        user_id=current_user.id,
        action="ASSIGNMENT_CHANGE",
        details=f"Assigned investigation to {assignee_name}"
    )
    db.add(activity)
    db.commit()
    db.refresh(inv)
    return inv

@router.get("/investigations/{investigation_id}/comments", response_model=List[CommentOut])
def get_investigation_comments(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(InvestigationComment)
        .filter(InvestigationComment.investigation_id == investigation_id)
        .order_by(InvestigationComment.created_at.asc())
        .all()
    )

@router.post("/investigations/{investigation_id}/comments", response_model=CommentOut)
def add_investigation_comment(
    investigation_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found.")

    comment = InvestigationComment(
        investigation_id=inv.id,
        user_id=current_user.id,
        content=comment_in.content,
        comment_type=comment_in.comment_type
    )
    db.add(comment)

    # Record activity log
    activity = InvestigationActivity(
        investigation_id=inv.id,
        user_id=current_user.id,
        action="ADDED_COMMENT",
        details=f"Added {comment_in.comment_type}: {comment_in.content[:50]}..."
    )
    db.add(activity)
    db.commit()
    db.refresh(comment)
    return comment

@router.get("/investigations/{investigation_id}/activity", response_model=List[ActivityOut])
def get_investigation_activity_timeline(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(InvestigationActivity)
        .filter(InvestigationActivity.investigation_id == investigation_id)
        .order_by(InvestigationActivity.created_at.desc())
        .all()
    )
