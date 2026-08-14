import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    investigations = relationship("Investigation", foreign_keys="[Investigation.user_id]", back_populates="user", cascade="all, delete-orphan")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    status = Column(String, default="Analyzing")
    severity = Column(String, default="Low")
    siem_source = Column(String, nullable=True)
    mitre_tactics = Column(Text, nullable=True)
    mitre_techniques = Column(Text, nullable=True)
    threat_intel = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="investigations")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    evidence = relationship("Evidence", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    report = relationship("Report", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    comments = relationship("InvestigationComment", back_populates="investigation", cascade="all, delete-orphan")
    activities = relationship("InvestigationActivity", back_populates="investigation", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, unique=True)
    file_name = Column(String, nullable=True)
    content = Column(Text, nullable=False)

    investigation = relationship("Investigation", back_populates="evidence")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    threat_type = Column(Text, nullable=True)
    possible_root_cause = Column(Text, nullable=True)
    confidence = Column(Text, nullable=True)
    indicators = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=False)
    pdf_path = Column(String, nullable=False)

    investigation = relationship("Investigation", back_populates="report")


class SIEMConfig(Base):
    __tablename__ = "siem_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False) # splunk, sentinel, elastic, webhook
    name = Column(String, nullable=False)
    api_url = Column(String, nullable=True)
    api_key = Column(String, nullable=True)
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False) # Splunk, Sentinel, Elastic, Webhook, System
    event_type = Column(String, nullable=False) # Phishing, BruteForce, Malware, SuspiciousActivity
    severity = Column(String, default="Low") # Low, Medium, High, Critical
    status = Column(String, default="New") # New, Processing, Investigated, Dismissed
    raw_data = Column(Text, nullable=False)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    risk_score = Column(Integer, default=50)
    ip_address = Column(String, nullable=True)
    username = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    severity = Column(String, default="High") # Low, Medium, High, Critical
    status = Column(String, default="New") # New, Investigating, Resolved, False Positive
    source = Column(String, default="STRIVOX AI")
    details = Column(Text, nullable=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class InvestigationComment(Base):
    __tablename__ = "investigation_comments"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    comment_type = Column(String, default="comment") # comment, note
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    investigation = relationship("Investigation", back_populates="comments")
    user = relationship("User")


class InvestigationActivity(Base):
    __tablename__ = "investigation_activities"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    investigation = relationship("Investigation", back_populates="activities")
    user = relationship("User")


class ThreatIntelConfig(Base):
    __tablename__ = "threat_intel_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False, unique=True) # virustotal, abuseipdb, otx
    api_key = Column(String, nullable=True)
    enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class NotificationConfig(Base):
    __tablename__ = "notification_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    sender_email = Column(String, nullable=True)
    use_tls = Column(Integer, default=1)
    notify_on_critical = Column(Integer, default=1)
    notify_on_assigned = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)




