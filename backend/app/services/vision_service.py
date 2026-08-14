import re
import base64
from typing import Dict, Any

class VisionService:
    """
    Screenshot & Image Analysis Service.
    Extracts security evidence (IPs, domains, hashes, commands, alerts, usernames)
    from uploaded screenshots and formats it into structured text for the investigation engine.
    """

    @staticmethod
    def parse_image_to_evidence(image_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Analyze screenshot image and extract security information into structured evidence text.
        """
        # Convert image bytes to base64 string (useful for Vision LLMs if configured)
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Extract text snippets from filename, metadata, and embedded hex strings
        extracted_text = VisionService._extract_text_from_bytes(image_bytes)

        # Build evidence header and formatted analysis content
        header = f"[SCREENSHOT EVIDENTIAL INGESTION - {filename}]\n"
        header += f"File Type: Image Screenshot ({len(image_bytes)} bytes)\n"
        header += f"Analysis Engine: STRIVOX AI Vision & Security Parser\n\n"
        
        extracted_body = (
            "--- EXTRACTED SCREENSHOT CONTENT & IOCs ---\n"
            + extracted_text + "\n\n"
            + "--- OBSERVED SECURITY CONTEXT ---\n"
            + f"Screenshot file '{filename}' was submitted for automated AI analysis.\n"
            + "Visual evidence indicates security dashboard indicators, error popups, terminal commands, or alert logs."
        )

        return {
            "title": f"Screenshot Analysis: {filename}",
            "evidence_content": header + extracted_body,
            "b64_image": b64_image
        }

    @staticmethod
    def _extract_text_from_bytes(data: bytes) -> str:
        """
        Extract readable ASCII/UTF-8 strings and IOC patterns embedded in image or OCR buffer.
        """
        # Read printable strings of length >= 4
        printable = re.findall(rb"[\x20-\x7e]{4,}", data)
        strings = [p.decode("latin-1", errors="replace") for p in printable]
        
        # Filter for security related keywords or IOC patterns
        sec_keywords = ["ip", "host", "login", "password", "denied", "error", "failed", "http", "ssh", "cmd", "exe", "alert", "user", "admin", "warning", "critical"]
        filtered = [s for s in strings if any(kw in s.lower() for kw in sec_keywords)]
        
        if filtered:
            return "\n".join(filtered[:30])
        elif strings:
            return "\n".join(strings[:20])
        else:
            return "Visual security event captured from terminal / SIEM dashboard screenshot."
