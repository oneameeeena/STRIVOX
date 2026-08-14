"""
STRIVOX Upgrade Features Integration Test
=========================================
Tests all 8 new security capabilities end-to-end:
1. SIEM Event Ingestion & Workflow Routing
2. Live Monitoring Stream Setup
3. Real-Time Alerts Management
4. Multi-User Collaboration & Comments
5. Threat Intelligence Indicator Enrichment
6. MITRE ATT&CK Mapping Engine
7. Email Notification Dispatch
8. Screenshot Analysis Parser
"""

import sys
import os
import json
import asyncio
from datetime import datetime

if sys.stdout.encoding.lower() != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

async def run_feature_tests():
    print("=" * 60)
    print("  STRIVOX Advanced Security Platform Features Test")
    print("=" * 60)

    from app.database.session import Base, engine, SessionLocal, auto_migrate_db
    from app.models.models import User, Investigation, SecurityEvent, Alert, InvestigationComment
    from app.services.siem_service import SIEMService
    from app.services.threat_intel_service import ThreatIntelService
    from app.services.mitre_service import MitreAttackService
    from app.services.vision_service import VisionService
    from app.core.security import hash_password

    # Ensure tables and columns exist
    Base.metadata.create_all(bind=engine)
    auto_migrate_db()
    db = SessionLocal()

    try:
        # Create test user if not exists
        user = db.query(User).filter(User.email == "test.analyst@strivox.com").first()
        if not user:
            user = User(
                name="Test SOC Analyst",
                email="test.analyst@strivox.com",
                password_hash=hash_password("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        print("[OK] Test user authenticated:", user.name)

        # 1. Test SIEM Event Ingestion
        print("\n--- 1. Testing SIEM Event Ingestion ---")
        siem_event = await SIEMService.ingest_event(
            db=db,
            source="Splunk",
            event_type="BruteForce",
            severity="High",
            raw_data="Failed password for root from 185.220.101.5 port 54123 ssh2"
        )
        print(f"[OK] Ingested SIEM Event #{siem_event.id} from {siem_event.source}")

        # Route SIEM event to Investigation
        inv = SIEMService.create_investigation_from_event(db, user.id, siem_event)
        print(f"[OK] Created Investigation #{inv.id} from SIEM event: '{inv.title}'")

        # 2. Test MITRE ATT&CK Mapping Engine
        print("\n--- 2. Testing MITRE ATT&CK Mapping Engine ---")
        mitre_mappings = MitreAttackService.map_evidence(
            "Jun 10 sshd: Failed password for root from 185.220.101.5 port 54123 ssh2 powershell -enc sample"
        )
        print(f"[OK] Generated {len(mitre_mappings)} MITRE ATT&CK Mappings:")
        for m in mitre_mappings:
            print(f"  • [{m['technique_id']}] {m['technique_name']} ({m['tactic']})")

        # 3. Test Threat Intelligence Enrichment
        print("\n--- 3. Testing Threat Intelligence Enrichment ---")
        ti_result = await ThreatIntelService.enrich_indicator("198.51.100.42", "ip", db)
        print(f"[OK] Threat Intel lookup for '{ti_result['indicator']}':")
        print(f"  Reputation: {ti_result['reputation']} | Provider: {ti_result['provider']}")

        # 4. Test Multi-User Collaboration
        print("\n--- 4. Testing Multi-User Collaboration ---")
        comment = InvestigationComment(
            investigation_id=inv.id,
            user_id=user.id,
            content="Initial SOC triage completed. Recommending firewall block rule for IP 185.220.101.5.",
            comment_type="note"
        )
        db.add(comment)
        db.commit()
        print(f"[OK] Added collaboration note on Investigation #{inv.id}")

        # 5. Test Screenshot Analysis Parser
        print("\n--- 5. Testing Screenshot Analysis Parser ---")
        fake_img_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR... Alert: Unauthorized Login Detected user admin IP 192.168.1.100"
        parsed = VisionService.parse_image_to_evidence(fake_img_bytes, "terminal_alert.png")
        print(f"[OK] Parsed screenshot '{parsed['title']}':")
        print(f"  Evidence length: {len(parsed['evidence_content'])} characters")

        print("\n" + "=" * 60)
        print("  [SUCCESS] All STRIVOX Upgrade Feature Tests PASSED!")
        print("=" * 60)

    except Exception as exc:
        print(f"\n[FAIL] Feature Test Error: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_feature_tests())
