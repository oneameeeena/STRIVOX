# -*- coding: utf-8 -*-
"""
STRIVOX AI Integration Test
============================
Tests the complete AI pipeline end-to-end using fictional email phishing evidence
and SSH evidence.

Usage (from the backend/ directory with the venv active):
    python test_ai.py
"""

import asyncio
import json
import sys

# Force UTF-8 output on Windows so AI response text prints without errors.
if sys.stdout.encoding.lower() != "utf-8":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Test evidence ─────────────────────────────────────────────────────────────

EMAIL_EVIDENCE = """
From: IT Security Desk <security-alert@update-verify-corp-portal.com>
To: john.doe@company.com
Date: Mon, 10 Aug 2026 14:32:00 -0400
Subject: URGENT: Action Required - Verify Your Account Credentials

Dear User,

Your Microsoft 365 account password is set to expire in 2 hours.
Failure to verify your identity will result in immediate suspension of your email access.

Please click the secure verification link below immediately to keep your current password:
https://login.microsoftonline.com.update-verify-corp-portal.com/auth/login

Thank you,
IT Helpdesk Support
""".strip()


# ── Test runner ───────────────────────────────────────────────────────────────

async def run_test() -> None:
    print("=" * 60)
    print("  STRIVOX Email Phishing AI Analysis Test")
    print("=" * 60)
    print()
    print("Evidence being analyzed:")
    print("-" * 60)
    print(EMAIL_EVIDENCE)
    print("-" * 60)
    print()
    print("Sending to OpenRouter... (this may take a few seconds)")
    print()

    from app.ai.analyzer import AIAnalyzer
    from app.schemas.schemas import SecurityAnalysisResult

    try:
        analyzer = AIAnalyzer()
        result: SecurityAnalysisResult = await analyzer.analyze_evidence(EMAIL_EVIDENCE)

        print("[OK]  AI analysis succeeded and passed Pydantic validation.")
        print()
        print("─── Structured Result ──────────────────────────────────────")
        print(json.dumps(result.model_dump(), indent=2))
        print("────────────────────────────────────────────────────────────")
        print()
        print(f"Threat type        : {result.threat_type}")
        print(f"Severity           : {result.severity}")
        print(f"Confidence         : {result.confidence}")
        print(f"Possible root cause: {result.possible_root_cause}")
        print()
        print("Recommended actions:")
        for i, action in enumerate(result.recommended_actions, 1):
            print(f"  {i}. {action}")
        print()
        print("[OK]  Email Phishing Test PASSED.")

    except Exception as exc:
        print(f"[FAIL]  Test FAILED: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_test())
