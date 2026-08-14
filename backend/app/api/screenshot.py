from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, Investigation, Evidence
from app.services.vision_service import VisionService

router = APIRouter()

@router.post("/investigations/screenshot", status_code=status.HTTP_201_CREATED)
async def upload_screenshot_investigation(
    file: UploadFile = File(...),
    title: str = Form(default=""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Accept security screenshot image (PNG, JPG, WEBP), extract IOCs & text evidence,
    and create an investigation record in the existing STRIVOX workflow.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No screenshot file provided.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Parse screenshot with Vision service
    parsed = VisionService.parse_image_to_evidence(raw_bytes, file.filename)

    inv_title = title.strip() if title and title.strip() else parsed["title"]

    inv = Investigation(
        user_id=current_user.id,
        title=inv_title,
        status="Pending",
        severity="Low"
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    evidence = Evidence(
        investigation_id=inv.id,
        file_name=file.filename,
        content=parsed["evidence_content"]
    )
    db.add(evidence)
    db.commit()

    return {"id": inv.id, "title": inv.title, "status": inv.status}
