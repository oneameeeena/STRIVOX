import re

class EvidenceParser:
    @staticmethod
    def parse_bytes(content: bytes, filename: str) -> str:
        decoded_text = ""
        for encoding in ("utf-8", "cp1252", "latin-1", "ascii"):
            try:
                decoded_text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if not decoded_text:
            decoded_text = content.decode("utf-8", errors="replace")
            
        return EvidenceParser.clean_text(decoded_text)

    @staticmethod
    def clean_text(text: str) -> str:
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        lines = text.split("\n")
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            normalized_line = re.sub(r'[ \t]+', ' ', stripped)
            cleaned_lines.append(normalized_line)
            
        return "\n".join(cleaned_lines)
