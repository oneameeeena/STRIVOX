from typing import List, Dict, Any

class MitreAttackService:
    """
    MITRE ATT&CK Mapping Service that analyzes investigation evidence
    and maps findings directly to MITRE tactics, techniques, and IDs.
    """

    KNOWLEDGE_BASE = [
        {
            "id": "T1566.002",
            "name": "Spearphishing Link",
            "tactic": "Initial Access",
            "keywords": ["phish", "verify your account", "password expire", "click the secure verification link", "update-verify", "login.microsoft"],
            "description": "Adversaries may send spearphishing emails with a malicious link to gain initial access or steal credentials.",
        },
        {
            "id": "T1566.001",
            "name": "Spearphishing Attachment",
            "tactic": "Initial Access",
            "keywords": ["attachment", ".exe", ".iso", ".zip", "invoice.pdf", "macro"],
            "description": "Adversaries send spearphishing emails with malicious attachments to execute code.",
        },
        {
            "id": "T1110.001",
            "name": "Password Guessing / Brute Force",
            "tactic": "Credential Access",
            "keywords": ["failed password", "invalid user", "failed login", "ssh", "brute force", "authentication failure"],
            "description": "Adversaries attempt to log into accounts by guessing passwords systematically.",
        },
        {
            "id": "T1059.001",
            "name": "PowerShell Execution",
            "tactic": "Execution",
            "keywords": ["powershell", "-enc", "-encodedcommand", "iex", "downloadstring", "invoke-expression"],
            "description": "Adversaries use PowerShell scripts to execute commands and scripts.",
        },
        {
            "id": "T1003",
            "name": "OS Credential Dumping",
            "tactic": "Credential Access",
            "keywords": ["mimikatz", "lsass", "sam", "shadow copy", "credential harvest", "steal password"],
            "description": "Adversaries attempt to extract credentials from memory or database files.",
        },
        {
            "id": "T1071.001",
            "name": "Web Protocols (C2)",
            "tactic": "Command and Control",
            "keywords": ["http beacon", "c2", "command and control", "reverse shell", "ngrok"],
            "description": "Adversaries communicate with compromised systems using web protocols like HTTP/HTTPS.",
        },
        {
            "id": "T1078",
            "name": "Valid Accounts",
            "tactic": "Defense Evasion",
            "keywords": ["valid user", "admin login", "privilege escalation", "root session"],
            "description": "Adversaries misuse legitimate credentials to bypass access controls.",
        }
    ]

    @staticmethod
    def map_evidence(evidence_text: str, ai_mappings: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Produce evidence-based MITRE ATT&CK technique mappings.
        Combines AI-generated mappings with heuristic pattern matching.
        """
        mappings = []
        seen_ids = set()

        # 1. Process AI-provided mappings first if available
        if ai_mappings:
            for item in ai_mappings:
                tid = item.get("technique_id", "").strip()
                if tid and tid not in seen_ids:
                    seen_ids.add(tid)
                    mappings.append({
                        "tactic": item.get("tactic", "Initial Access"),
                        "technique_id": tid,
                        "technique_name": item.get("technique_name", "Unknown Technique"),
                        "description": item.get("description", "Identified by STRIVOX AI investigation engine."),
                        "confidence": item.get("confidence", "High"),
                        "evidence": item.get("evidence", "Evidence observation")
                    })

        # 2. Rule-based heuristic extraction for any unmapped indicators
        text_lower = evidence_text.lower()
        for rule in MitreAttackService.KNOWLEDGE_BASE:
            if rule["id"] not in seen_ids:
                matched_kw = [kw for kw in rule["keywords"] if kw in text_lower]
                if matched_kw:
                    seen_ids.add(rule["id"])
                    mappings.append({
                        "tactic": rule["tactic"],
                        "technique_id": rule["id"],
                        "technique_name": rule["name"],
                        "description": rule["description"],
                        "confidence": "High" if len(matched_kw) > 1 else "Medium",
                        "evidence": f"Observed indicators in text matching '{', '.join(matched_kw[:3])}'"
                    })

        # Default fallback mapping if none matched
        if not mappings:
            mappings.append({
                "tactic": "Initial Access",
                "technique_id": "T1566",
                "technique_name": "Phishing / Suspicious Activity",
                "description": "General suspicious security activity requiring investigation.",
                "confidence": "Medium",
                "evidence": "Suspicious pattern detected in submitted evidence."
            })

        return mappings
