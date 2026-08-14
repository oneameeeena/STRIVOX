import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import NotificationConfig, InAppNotification, User

class NotificationService:
    """
    Handles email notifications via SMTP and in-app alert notifications.
    """

    @staticmethod
    def send_email(
        config: NotificationConfig,
        to_email: str,
        subject: str,
        body_text: str
    ) -> bool:
        """
        Send email using configured SMTP settings.
        """
        if not config or not config.smtp_host or not config.smtp_user or not config.smtp_password:
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = config.sender_email or config.smtp_user
            msg["To"] = to_email

            part1 = MIMEText(body_text, "plain")
            msg.attach(part1)

            port = config.smtp_port or 587
            with smtplib.SMTP(config.smtp_host, port, timeout=5) as server:
                if config.use_tls:
                    server.starttls()
                server.login(config.smtp_user, config.smtp_password)
                server.sendmail(msg["From"], [to_email], msg.as_string())
            return True
        except Exception:
            return False

    @staticmethod
    def notify_user(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        send_email: bool = True
    ) -> InAppNotification:
        """
        Create an in-app notification and optionally dispatch an email.
        """
        notification = InAppNotification(
            user_id=user_id,
            title=title,
            message=message,
            read=0
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        if send_email:
            user = db.query(User).filter(User.id == user_id).first()
            cfg = db.query(NotificationConfig).filter(NotificationConfig.user_id == user_id).first()
            if user and cfg and cfg.smtp_host:
                NotificationService.send_email(
                    config=cfg,
                    to_email=user.email,
                    subject=f"[STRIVOX Alert] {title}",
                    body_text=f"Hello {user.name},\n\n{message}\n\nLog in to STRIVOX Security Operations Portal to investigate."
                )

        return notification
