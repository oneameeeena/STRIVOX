from pydantic import BaseModel, EmailStr, Field
from typing import List, Literal, Optional
from datetime import datetime

# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Evidence ──────────────────────────────────────────────────────────────────

class EvidenceCreate(BaseModel):
    file_name: Optional[str] = None
    content: str

class EvidenceOut(BaseModel):
    id: int
    file_name: Optional[str]
    content: str

    class Config:
        from_attributes = True

# ── Investigations ────────────────────────────────────────────────────────────

# ── Investigations ────────────────────────────────────────────────────────────

class InvestigationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    pasted_evidence: Optional[str] = None

class UserBrief(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class InvestigationOut(BaseModel):
    id: int
    user_id: int
    assigned_user_id: Optional[int] = None
    title: str
    status: str
    severity: str
    siem_source: Optional[str] = None
    mitre_tactics: Optional[str] = None
    mitre_techniques: Optional[str] = None
    threat_intel: Optional[str] = None
    created_at: datetime
    assigned_user: Optional[UserBrief] = None

    class Config:
        from_attributes = True

# ── AI Analysis ───────────────────────────────────────────────────────────────

class MitreMapping(BaseModel):
    tactic: str
    technique_id: str
    technique_name: str
    description: str
    confidence: str = "High"
    evidence: str

class SecurityAnalysisResult(BaseModel):
    """
    Validated, structured result from the STRIVOX AI analyzer.
    MVP Schema: incident_summary, threat_type, severity, possible_root_cause, recommended_actions.
    """
    incident_summary: str
    threat_type: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    possible_root_cause: str
    recommended_actions: List[str]
    confidence: Optional[str] = "High"
    indicators: Optional[List[str]] = Field(default_factory=list)
    mitre_mappings: Optional[List[dict]] = Field(default_factory=list)
    threat_intel: Optional[dict] = Field(default_factory=dict)



# Keep backward-compatible alias
AIAnalysisResult = SecurityAnalysisResult

# ── Reports ───────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: int
    investigation_id: int
    summary: str
    recommendations: List[str]
    pdf_path: str

    class Config:
        from_attributes = True

class InvestigationDetailOut(BaseModel):
    investigation: InvestigationOut
    evidence: Optional[EvidenceOut] = None
    report: Optional[ReportOut] = None

    class Config:
        from_attributes = True

# ── Analyze endpoint response ─────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    investigation_id: int
    status: str
    analysis: SecurityAnalysisResult


# ── SIEM ──────────────────────────────────────────────────────────────────────

class SIEMConfigCreate(BaseModel):
    provider: str
    name: str
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled: int = 1

class SIEMConfigOut(BaseModel):
    id: int
    provider: str
    name: str
    api_url: Optional[str]
    enabled: int
    created_at: datetime

    class Config:
        from_attributes = True

class SIEMTestRequest(BaseModel):
    provider: str
    api_url: Optional[str] = None
    api_key: Optional[str] = None

class SIEMEventCreate(BaseModel):
    source: str
    event_type: str
    severity: str = "Low"
    raw_data: str

class SIEMEventOut(BaseModel):
    id: int
    source: str
    event_type: str
    severity: str
    status: str
    raw_data: str
    investigation_id: Optional[int] = None
    timestamp: datetime
    risk_score: Optional[int] = 50
    ip_address: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True

# ── Real-Time Alerts ──────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    title: str
    severity: str
    status: str
    source: str
    details: Optional[str]
    investigation_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: Literal["New", "Investigating", "Resolved", "False Positive"]

# ── Collaboration ─────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    comment_type: Literal["comment", "note"] = "comment"

class CommentOut(BaseModel):
    id: int
    investigation_id: int
    user_id: int
    content: str
    comment_type: str
    created_at: datetime
    user: UserBrief

    class Config:
        from_attributes = True

class ActivityOut(BaseModel):
    id: int
    investigation_id: int
    user_id: int
    action: str
    details: Optional[str]
    created_at: datetime
    user: UserBrief

    class Config:
        from_attributes = True

class AssignUserRequest(BaseModel):
    assigned_user_id: Optional[int]

# ── Threat Intelligence ───────────────────────────────────────────────────────

class ThreatIntelLookupRequest(BaseModel):
    indicator: str
    indicator_type: Optional[str] = None # ip, domain, url, hash, email

class ThreatIntelConfigCreate(BaseModel):
    provider: str # virustotal, abuseipdb, otx
    api_key: Optional[str] = None
    enabled: int = 1

class ThreatIntelConfigOut(BaseModel):
    id: int
    provider: str
    enabled: int
    created_at: datetime

    class Config:
        from_attributes = True

# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationConfigCreate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    sender_email: Optional[str] = None
    use_tls: int = 1
    notify_on_critical: int = 1
    notify_on_assigned: int = 1

class NotificationConfigOut(BaseModel):
    id: int
    smtp_host: Optional[str]
    smtp_port: int
    smtp_user: Optional[str]
    sender_email: Optional[str]
    use_tls: int
    notify_on_critical: int
    notify_on_assigned: int

    class Config:
        from_attributes = True

class InAppNotificationOut(BaseModel):
    id: int
    title: str
    message: str
    read: int
    created_at: datetime

    class Config:
        from_attributes = True

