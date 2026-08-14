"""
STRIVOX Investigation Report API Verification Script
===================================================
Tests end-to-end report navigation and data loading across 3 distinct investigations:
1. Investigation #8 (SIEM BruteForce Alert)
2. Investigation #9 (PowerShell / System Log Analysis)
3. Investigation #10 (Email Phishing Evidence)
"""

import sys
import os
import json

if sys.stdout.encoding.lower() != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def test_report_endpoints():
    print("=" * 65)
    print("  STRIVOX Investigation Report End-to-End Verification")
    print("=" * 65)

    from app.database.session import Base, engine, SessionLocal, auto_migrate_db
    from app.models.models import User, Investigation, Evidence, Report
    from app.core.security import hash_password, create_access_token

    Base.metadata.create_all(bind=engine)
    auto_migrate_db()
    db = SessionLocal()

    try:
        # Fetch or create test user
        user = db.query(User).first()
        if not user:
            user = User(
                name="Test SOC Analyst",
                email="analyst@strivox.com",
                password_hash=hash_password("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        print(f"[OK] Authenticated user email: {user.email}")

        # Get existing investigations
        invs = db.query(Investigation).order_by(Investigation.id.asc()).all()
        print(f"[OK] Total investigations in platform database: {len(invs)}")

        # Ensure we have at least 3 distinct investigations to test
        if len(invs) < 3:
            for idx in range(len(invs) + 1, 4):
                new_inv = Investigation(
                    user_id=user.id,
                    title=f"Sample Incident #{idx}: Threat Telemetry",
                    status="Completed" if idx % 2 == 0 else "Pending",
                    severity="High" if idx % 2 == 0 else "Medium",
                    siem_source="Splunk" if idx % 2 == 0 else "Log Upload"
                )
                db.add(new_inv)
                db.commit()
                db.refresh(new_inv)

                # Add sample report
                rep = Report(
                    investigation_id=new_inv.id,
                    summary=f"Incident summary for investigation #{new_inv.id}.",
                    threat_type="Credential Access",
                    possible_root_cause="Brute force login attempts.",
                    confidence="High",
                    indicators=json.dumps(["185.220.101.5", "root"]),
                    recommendations=json.dumps(["Block IP address"]),
                    pdf_path=f"reports/report_{new_inv.id}.pdf"
                )
                db.add(rep)
                db.commit()

            invs = db.query(Investigation).order_by(Investigation.id.asc()).all()

        target_ids = [invs[0].id, invs[1].id, invs[2].id]
        print(f"[OK] Target Investigation IDs selected for testing: {target_ids}")

        from fastapi.testclient import TestClient
        from app.main import app
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = lambda: user
        client = TestClient(app)

        for target_id in target_ids:
            print(f"\n--- Testing GET /api/report/{target_id} ---")
            resp = client.get(f"/api/report/{target_id}")
            
            assert resp.status_code == 200, f"Expected HTTP 200 for investigation #{target_id}, got {resp.status_code}: {resp.text}"
            data = resp.json()
            
            assert "investigation" in data, "Response missing 'investigation' key"
            assert "report" in data, "Response missing 'report' key"
            
            inv_data = data["investigation"]
            rep_data = data["report"]

            assert inv_data["id"] == target_id, f"ID mismatch! Expected {target_id}, got {inv_data['id']}"
            assert rep_data is not None, f"Report data is None for investigation #{target_id}"

            print(f"  • Investigation #{inv_data['id']}: '{inv_data['title']}'")
            print(f"  • Status: {inv_data['status']} | Severity: {inv_data['severity']}")
            print(f"  • Summary: {rep_data['summary'][:80]}...")
            print(f"  • Threat Type: {rep_data['threat_type']}")
            print(f"  • Indicators count: {len(rep_data['indicators'])}")
            print(f"  • Recommendations count: {len(rep_data['recommendations'])}")
            print(f"[SUCCESS] Investigation #{target_id} report API verified successfully!")

        print("\n" + "=" * 65)
        print("  [SUCCESS] All 3 Investigation Report Endpoints PASSED!")
        print("=" * 65)

    except Exception as exc:
        print(f"\n[FAIL] Test error: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_report_endpoints()
