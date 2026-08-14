"""
Analysis & Report API endpoints.

POST /api/investigations  — create investigation + store evidence (multipart form)
POST /api/analyze         — run AI analysis on an existing investigation
GET  /api/report/{id}     — fetch investigation + report data
GET  /api/report/{id}/pdf — download the generated PDF

Security:
  - All routes require a valid Bearer token.
  - OPENROUTER_API_KEY is read server-side only; never returned in any response.
  - Raw AI output is never saved; only Pydantic-validated data reaches the DB.
"""

import json
import os
import asyncio
from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.models import User, Investigation, Evidence, Report
from app.parser.parser import EvidenceParser
from app.ai.analyzer import AIAnalyzer
from app.ai.client import (
    OpenRouterConfigError,
    OpenRouterAuthError,
    OpenRouterRateLimitError,
    OpenRouterServiceError,
    OpenRouterTimeoutError,
    OpenRouterResponseError,
)
from app.reports.generator import generate_pdf_report
from app.schemas.schemas import AnalyzeResponse, SecurityAnalysisResult

router = APIRouter()


# ── Create investigation + evidence ──────────────────────────────────────────


@router.post("/investigations", status_code=status.HTTP_201_CREATED)
async def create_investigation(
    title: str = Form(...),
    pasted_evidence: str = Form(default=""),
    file: UploadFile = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create an investigation record and persist the evidence.
    Accepts either a pasted text block or an uploaded .log/.txt file.
    The frontend calls this first, then calls /analyze with the returned id.
    """
    # 1. Resolve evidence content
    content = ""
    file_name = None

    if file and file.filename:
        raw_bytes = await file.read()
        content = EvidenceParser.parse_bytes(raw_bytes, file.filename)
        file_name = file.filename
    elif pasted_evidence and pasted_evidence.strip():
        content = EvidenceParser.clean_text(pasted_evidence)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No evidence provided. Please paste text or upload a .log / .txt file.",
        )

    # 2. Create investigation row
    inv = Investigation(
        user_id=current_user.id,
        title=title,
        status="Pending",
        severity="Low",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # 3. Store evidence
    ev = Evidence(
        investigation_id=inv.id,
        content=content,
        file_name=file_name,
    )
    db.add(ev)
    db.commit()

    # 4. Create SecurityEvent & Broadcast to Live Monitoring
    from app.models.models import SecurityEvent
    from app.services.event_bus import event_bus
    from app.services.threat_intel_service import ThreatIntelService

    extracted = ThreatIntelService.extract_indicators(content)
    ip_addr = extracted["ips"][0] if extracted["ips"] else None
    
    sec_event = SecurityEvent(
        source=file_name or "Pasted Evidence",
        event_type="Log Analysis",
        severity="Low",
        status="New",
        raw_data=content[:250],
        investigation_id=inv.id,
        risk_score=30,
        ip_address=ip_addr,
        username=None
    )
    db.add(sec_event)
    db.commit()

    try:
        loop = asyncio.get_event_loop()
        loop.create_task(event_bus.broadcast({
            "type": "NEW_SECURITY_EVENT",
            "data": {
                "id": sec_event.id,
                "source": sec_event.source,
                "event_type": sec_event.event_type,
                "severity": sec_event.severity,
                "status": sec_event.status,
                "raw_data": sec_event.raw_data,
                "investigation_id": inv.id,
                "risk_score": sec_event.risk_score,
                "ip_address": sec_event.ip_address,
                "username": sec_event.username,
                "timestamp": sec_event.timestamp.isoformat()
            }
        }))
    except Exception:
        pass

    return {"id": inv.id, "title": inv.title, "status": inv.status}


# ── Run AI analysis ───────────────────────────────────────────────────────────


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_investigation(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full analysis pipeline:
        Retrieve evidence → Parse → OpenRouter AI → Validate → Save → PDF

    Pipeline:
        Authenticated User
               ↓
        Investigation ID
               ↓
        Retrieve Evidence
               ↓
        Parse Evidence
               ↓
        OpenRouter AI
               ↓
        Pydantic Validation
               ↓
        Save Report
               ↓
        Update Investigation
               ↓
        Generate PDF
               ↓
        Return AnalyzeResponse
    """
    investigation_id = payload.get("investigation_id")
    if not investigation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="investigation_id is required in the request body.",
        )

    # Fetch investigation
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found.")

    evidence = db.query(Evidence).filter(Evidence.investigation_id == inv.id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No evidence found for this investigation. Create the investigation with evidence first.",
        )

    # Mark as Analyzing
    inv.status = "Analyzing"
    db.commit()

    result: SecurityAnalysisResult | None = None

    try:
        # ── AI Analysis ───────────────────────────────────────────────────────
        analyzer = AIAnalyzer()
        result = await analyzer.analyze_evidence(evidence.content)

        # ── Generate PDF Report ───────────────────────────────────────────────
        pdf_path = generate_pdf_report(
            investigation_id=inv.id,
            title=inv.title,
            severity=result.severity,
            status="Completed",
            created_at=inv.created_at,
            incident_summary=result.incident_summary,
            threat_type=result.threat_type,
            possible_root_cause=result.possible_root_cause,
            recommended_actions=result.recommended_actions,
            confidence=getattr(result, "confidence", "High") or "High",
            indicators=getattr(result, "indicators", []) or [],
        )

        # ── Persist validated report ──────────────────────────────────────────
        report = db.query(Report).filter(Report.investigation_id == inv.id).first()
        if report:
            report.summary = result.incident_summary
            report.threat_type = result.threat_type
            report.possible_root_cause = result.possible_root_cause
            report.confidence = getattr(result, "confidence", "High") or "High"
            report.indicators = json.dumps(getattr(result, "indicators", []) or [])
            report.recommendations = json.dumps(result.recommended_actions)
            report.pdf_path = pdf_path
        else:
            report = Report(
                investigation_id=inv.id,
                summary=result.incident_summary,
                threat_type=result.threat_type,
                possible_root_cause=result.possible_root_cause,
                confidence=getattr(result, "confidence", "High") or "High",
                indicators=json.dumps(getattr(result, "indicators", []) or []),
                recommendations=json.dumps(result.recommended_actions),
                pdf_path=pdf_path,
            )
            db.add(report)

        # ── Update investigation status to Completed ──────────────────────────
        inv.status = "Completed"
        inv.severity = result.severity
        db.commit()

        # ── Optional Alerts & Telemetry (Errors here will not fail investigation)
        try:
            sec_event = db.query(SecurityEvent).filter(SecurityEvent.investigation_id == inv.id).first()
            risk = 95 if result.severity == "Critical" else (80 if result.severity == "High" else (55 if result.severity == "Medium" else 25))
            if sec_event:
                sec_event.severity = result.severity
                sec_event.event_type = result.threat_type
                sec_event.status = "Investigated"
                sec_event.risk_score = risk
                db.commit()

            if result.severity in ("High", "Critical"):
                from app.models.models import Alert
                from app.services.event_bus import event_bus
                from app.services.notification_service import NotificationService

                alert = Alert(
                    title=f"{result.severity} Risk Detected: {result.threat_type}",
                    severity=result.severity,
                    status="New",
                    source="STRIVOX AI Engine",
                    details=f"Investigation #{inv.id} '{inv.title}' flagged as {result.severity} severity.\nSummary: {result.incident_summary[:200]}",
                    investigation_id=inv.id
                )
                db.add(alert)
                db.commit()

                await event_bus.broadcast({
                    "type": "NEW_ALERT",
                    "data": {
                        "id": alert.id,
                        "title": alert.title,
                        "severity": alert.severity,
                        "status": alert.status,
                        "investigation_id": inv.id,
                        "created_at": alert.created_at.isoformat()
                    }
                })

                NotificationService.notify_user(
                    db=db,
                    user_id=current_user.id,
                    title=f"CRITICAL ALERT: {result.threat_type}",
                    message=f"STRIVOX AI detected a {result.severity} severity threat in Investigation #{inv.id} ({inv.title}).\n\nSummary:\n{result.incident_summary}"
                )
        except Exception as exc:
            print(f"[Warning] Optional telemetry notification error skipped: {exc}")

        return AnalyzeResponse(
            investigation_id=inv.id,
            status="Completed",
            analysis=result,
        )

    # ── Controlled error handling ─────────────────────────────────────────────
    except OpenRouterConfigError as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Backend configuration error: {exc}",
        )
    except OpenRouterAuthError as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service authentication error. Check OPENROUTER_API_KEY.",
        )
    except OpenRouterRateLimitError as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service rate limit reached. Please wait and try again.",
        )
    except OpenRouterTimeoutError as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI service timed out. Please try again.",
        )
    except OpenRouterServiceError as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {exc}",
        )
    except (OpenRouterResponseError, ValueError) as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI response could not be validated: {exc}",
        )
    except Exception as exc:
        _fail_investigation(inv, db)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during analysis: {exc}",
        )


def _fail_investigation(inv: Investigation, db: Session) -> None:
    """Helper: mark investigation as Failed and commit."""
    try:
        inv.status = "Failed"
        db.commit()
    except Exception:
        db.rollback()


# ── Get report JSON ───────────────────────────────────────────────────────────


@router.get("/report/{investigation_id}")
def get_report(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the investigation metadata + report data as JSON."""
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found.")

    report = db.query(Report).filter(Report.investigation_id == inv.id).first()

    report_data = None
    if report:
        try:
            recommendations = json.loads(report.recommendations)
        except (json.JSONDecodeError, TypeError):
            recommendations = [report.recommendations] if report.recommendations else []

        try:
            indicators = json.loads(report.indicators) if report.indicators else []
        except (json.JSONDecodeError, TypeError):
            indicators = [report.indicators] if report.indicators else []

        try:
            mitre_mappings = json.loads(inv.mitre_techniques) if inv.mitre_techniques else []
        except Exception:
            mitre_mappings = []

        try:
            threat_intel = json.loads(inv.threat_intel) if inv.threat_intel else {}
        except Exception:
            threat_intel = {}

        report_data = {
            "id": report.id,
            "investigation_id": report.investigation_id,
            "summary": report.summary or "Investigation evidence recorded.",
            "threat_type": report.threat_type or "Security Event",
            "possible_root_cause": report.possible_root_cause or "Under security review.",
            "confidence": report.confidence or "High",
            "indicators": indicators,
            "recommendations": recommendations,
            "mitre_mappings": mitre_mappings,
            "threat_intel": threat_intel,
            "pdf_path": report.pdf_path,
        }
    else:
        # Fallback synthesis for investigations pending AI execution or created via SIEM
        ev = db.query(Evidence).filter(Evidence.investigation_id == inv.id).first()
        ev_content = ev.content if ev else inv.title
        try:
            mitre_mappings = json.loads(inv.mitre_techniques) if inv.mitre_techniques else []
        except Exception:
            mitre_mappings = []

        try:
            threat_intel = json.loads(inv.threat_intel) if inv.threat_intel else {}
        except Exception:
            threat_intel = {}

        report_data = {
            "id": 0,
            "investigation_id": inv.id,
            "summary": f"Investigation #{inv.id} ({inv.title}) has been registered in the STRIVOX security platform.",
            "threat_type": "Security Event",
            "possible_root_cause": "Pending automated AI security analysis.",
            "confidence": "Medium",
            "indicators": [ev_content[:150]] if ev_content else [],
            "recommendations": ["Execute AI analysis to generate full executive report."],
            "mitre_mappings": mitre_mappings,
            "threat_intel": threat_intel,
            "pdf_path": None,
        }

    return {
        "investigation": {
            "id": inv.id,
            "user_id": inv.user_id,
            "assigned_user_id": inv.assigned_user_id,
            "title": inv.title,
            "status": inv.status,
            "severity": inv.severity,
            "siem_source": inv.siem_source,
            "created_at": inv.created_at,
        },
        "report": report_data,
    }


# ── Download PDF ──────────────────────────────────────────────────────────────


@router.get("/report/{investigation_id}/pdf")
def download_report_pdf(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream the PDF file for download."""
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found.")

    report = db.query(Report).filter(Report.investigation_id == inv.id).first()
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF report file not found on server.",
        )

    return FileResponse(
        path=report.pdf_path,
        media_type="application/pdf",
        filename=f"Strivox_Report_{investigation_id}.pdf",
    )
