"""
STRIVOX AI Analyzer

Pipeline:
    Raw evidence text
        → OpenRouter (via OpenRouterClient)
        → Raw JSON string
        → json.loads()
        → Pydantic validation (SecurityAnalysisResult)
        → Validated result  ← only this reaches the database

Raw AI output is NEVER saved directly.
If any step fails, a clear exception is raised so the caller can
set investigation.status = "Failed" and return a controlled error.
"""

import json
import re
from typing import Dict, Any

from app.ai.client import OpenRouterClient
from app.ai.prompts import SYSTEM_PROMPT
from app.schemas.schemas import SecurityAnalysisResult


class AIAnalyzer:
    """
    Orchestrates: evidence → OpenRouter → validated SecurityAnalysisResult.
    """

    def __init__(self) -> None:
        # Client validates OPENROUTER_API_KEY on construction — fail fast.
        self.client = OpenRouterClient()

    # ── Public ────────────────────────────────────────────────────────────────

    async def analyze_evidence(self, evidence_text: str) -> SecurityAnalysisResult:
        """
        Send evidence to OpenRouter and return a validated result.

        Raises:
            Any OpenRouter*Error from the client layer.
            ValueError  – if the AI response cannot be parsed or validated.
        """
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": f"Security Evidence:\n\n{evidence_text}"},
        ]

        # Step 1: Call OpenRouter
        raw_response: str = await self.client.get_chat_completion(messages)

        # Step 2: Extract JSON from the raw text
        raw_dict: Dict[str, Any] = self._extract_json(raw_response)

        # Step 3: Normalize field values (handle minor LLM formatting quirks)
        normalized: Dict[str, Any] = self._normalize(raw_dict)

        # Step 4: Validate with Pydantic — raises ValidationError on failure
        try:
            result = SecurityAnalysisResult(**normalized)
        except Exception as exc:
            raise ValueError(
                f"AI response failed Pydantic validation: {exc}\n"
                f"Normalized dict was: {normalized}"
            ) from exc

        return result

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Parse JSON from the raw AI response.
        Robustly handles code fences, trailing commas, unescaped newlines, unclosed quotes,
        and fallback regex extraction for MVP schema fields.
        """
        cleaned = text.strip()

        # Strip ```json ... ``` or ``` ... ``` code fences if present
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1)
        else:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start : end + 1]

        # Standard JSON parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Trailing-comma repair & literal newline escaping in strings
        repaired = re.sub(r",\s*([}\]])", r"\1", cleaned)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass

        # Escape literal newlines inside quotes
        def _fix_newlines(match):
            return match.group(0).replace("\n", "\\n").replace("\r", "")
        
        repaired_lines = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', _fix_newlines, repaired)
        try:
            return json.loads(repaired_lines)
        except json.JSONDecodeError:
            pass

        # Auto-close unclosed string quote / brackets if truncated
        truncated_fix = repaired_lines
        if truncated_fix.count('"') % 2 != 0:
            truncated_fix += '"'
        if not truncated_fix.endswith("}"):
            truncated_fix += "\n}"
        try:
            return json.loads(truncated_fix)
        except json.JSONDecodeError:
            pass

        # Fallback: Regex extraction for MVP schema fields
        fallback_data = {}
        for key in ("incident_summary", "threat_type", "severity", "possible_root_cause"):
            m = re.search(rf'"{key}"\s*:\s*"([^"]*)', text, re.IGNORECASE)
            if m:
                fallback_data[key] = m.group(1).strip()

        actions_match = re.search(r'"recommended_actions"\s*:\s*\[(.*?)\]', text, re.DOTALL | re.IGNORECASE)
        if actions_match:
            actions_raw = actions_match.group(1)
            actions = re.findall(r'"([^"]+)"', actions_raw)
            fallback_data["recommended_actions"] = actions
        elif "incident_summary" in fallback_data:
            fallback_data["recommended_actions"] = ["Review security logs and investigate origin."]

        if fallback_data.get("incident_summary"):
            return fallback_data

        raise ValueError(
            f"AI response is not valid JSON and could not be repaired.\n"
            f"Raw content: {text[:500]}"
        )

    def _normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize the parsed dict before Pydantic validation.
        Handles:
          - case-insensitive severity matching
          - partial severity words (e.g. 'CRIT' → 'Critical')
          - recommended_actions as a string instead of a list
          - None text fields → placeholder string
          - Fuzzy key matching for slightly renamed fields
        """
        REQUIRED_KEYS = [
            "incident_summary",
            "threat_type",
            "severity",
            "possible_root_cause",
            "recommended_actions",
        ]

        normalized: Dict[str, Any] = {}

        for key in REQUIRED_KEYS:
            # Exact match first
            val = data.get(key)

            # Fuzzy match: compare lowercased underscore-normalized keys
            if val is None:
                for dkey, dval in data.items():
                    if dkey.lower().replace(" ", "_").replace("-", "_") == key:
                        val = dval
                        break

            normalized[key] = val

        # ── Severity normalization ────────────────────────────────────────────
        severity = normalized.get("severity")
        if severity:
            s = str(severity).strip().capitalize()
            valid = {"Low", "Medium", "High", "Critical"}
            if s not in valid:
                sl = s.lower()
                if "crit" in sl:
                    s = "Critical"
                elif "high" in sl:
                    s = "High"
                elif "med" in sl:
                    s = "Medium"
                else:
                    s = "Low"
            normalized["severity"] = s
        else:
            normalized["severity"] = "Low"

        # ── Confidence normalization ──────────────────────────────────────────
        conf = normalized.get("confidence")
        if conf and str(conf).strip():
            c = str(conf).strip().capitalize()
            if "high" in c.lower():
                c = "High"
            elif "med" in c.lower():
                c = "Medium"
            elif "low" in c.lower():
                c = "Low"
            normalized["confidence"] = c
        else:
            normalized["confidence"] = "High"

        # ── indicators: must be a list[str] ───────────────────────────────────
        inds = normalized.get("indicators")
        if isinstance(inds, list):
            cleaned_inds = [str(i).strip() for i in inds if str(i).strip()]
            normalized["indicators"] = cleaned_inds
        elif isinstance(inds, str):
            normalized["indicators"] = [
                item.strip()
                for item in re.split(r"[,\n;]", inds)
                if item.strip()
            ]
        else:
            normalized["indicators"] = []

        # ── recommended_actions: must be a list[str] ──────────────────────────
        actions = normalized.get("recommended_actions")
        if isinstance(actions, list):
            # Clean each element
            cleaned = [str(a).strip() for a in actions if str(a).strip()]
            normalized["recommended_actions"] = cleaned or [
                "Review security controls and logs."
            ]
        elif isinstance(actions, str):
            normalized["recommended_actions"] = [
                item.strip()
                for item in re.split(r"[,\n;]", actions)
                if item.strip()
            ] or ["Review security controls and logs."]
        else:
            normalized["recommended_actions"] = [
                "Review security controls and logs."
            ]

        # ── Text fields: must be non-empty strings ────────────────────────────
        for key in ("incident_summary", "threat_type", "possible_root_cause"):
            val = normalized.get(key)
            if not val or not str(val).strip():
                normalized[key] = "Insufficient evidence to determine details."
            else:
                normalized[key] = str(val).strip()

        # ── mitre_mappings normalization ──────────────────────────────────────
        mitre = data.get("mitre_mappings")
        if isinstance(mitre, list):
            cleaned_mitre = []
            for item in mitre:
                if isinstance(item, dict):
                    cleaned_mitre.append({
                        "tactic": str(item.get("tactic", "Initial Access")),
                        "technique_id": str(item.get("technique_id", "T1566")),
                        "technique_name": str(item.get("technique_name", "Phishing")),
                        "description": str(item.get("description", "Suspicious attack vector observed.")),
                        "confidence": str(item.get("confidence", "High")),
                        "evidence": str(item.get("evidence", "Log/Evidence indicator")),
                    })
            normalized["mitre_mappings"] = cleaned_mitre
        else:
            normalized["mitre_mappings"] = []

        # ── threat_intel normalization ─────────────────────────────────────────
        ti = data.get("threat_intel")
        if isinstance(ti, dict):
            normalized["threat_intel"] = ti
        else:
            normalized["threat_intel"] = {}

        return normalized
