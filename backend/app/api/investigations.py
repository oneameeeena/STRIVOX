from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, Investigation
from app.schemas.schemas import InvestigationOut

router = APIRouter()


@router.get("/investigations", response_model=list[InvestigationOut])
def list_investigations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all investigations for the authenticated SOC platform."""
    return (
        db.query(Investigation)
        .order_by(Investigation.created_at.desc())
        .all()
    )


@router.get("/investigations/{investigation_id}", response_model=InvestigationOut)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv
