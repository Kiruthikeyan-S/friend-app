"""
Privacy Guard Service
Deterministic detection, redaction, memory-safety filtering, and response sanitization
for passwords, API keys, access tokens, JWTs, emails, phone numbers, and financial details.
Applies identically to both text messages and voice transcripts.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Pattern, Tuple


@dataclass
class PrivacyFinding:
    category: str
    severity: str  # "hard_secret" | "pii" | "financial"
    redaction_tag: str
    matched_preview: str


@dataclass
class PrivacyScanResult:
    original_length: int
    redacted_text: str
    findings: List[PrivacyFinding] = field(default_factory=list)
    has_hard_secret: bool = False
    has_financial: bool = False
    has_pii: bool = False
    is_privacy_attack: bool = False

    def to_summary(self) -> Dict[str, Any]:
        return {
            "has_hard_secret": self.has_hard_secret,
            "has_financial": self.has_financial,
            "has_pii": self.has_pii,
            "is_privacy_attack": self.is_privacy_attack,
            "finding_categories": sorted({f.category for f in self.findings}),
            "finding_count": len(self.findings),
        }


# Deterministic secret / PII / financial detection rules (ordered most-specific first)
_DETECTION_RULES: List[Tuple[str, str, str, Pattern[str]]] = [
    (
        "api_key",
        "hard_secret",
        "[REDACTED_API_KEY]",
        re.compile(
            r"\b(?:gsk_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|"
            r"sb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|"
            r"AKIA[0-9A-Z]{16})\b"
        ),
    ),
    (
        "jwt_token",
        "hard_secret",
        "[REDACTED_TOKEN]",
        re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    ),
    (
        "bearer_or_access_token",
        "hard_secret",
        "[REDACTED_TOKEN]",
        re.compile(
            r"(?i)(?:bearer\s+[A-Za-z0-9._-]{16,}|"
            r"(?:access_token|refresh_token|auth_token|api_key|secret_key)\s*[:=]\s*['\"]?[A-Za-z0-9._-]{8,}['\"]?)"
        ),
    ),
    (
        "password",
        "hard_secret",
        "[REDACTED_PASSWORD]",
        re.compile(
            r"(?i)(?:\b(?:my\s+)?(?:password|passcode|passphrase|pin\s*code|pwd)\s*(?:is|:|=)\s*['\"]?[^\s,;'\"]{4,}['\"]?)"
        ),
    ),
    (
        "payment_card",
        "financial",
        "[REDACTED_CARD]",
        re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
    ),
    (
        "cvv_or_bank",
        "financial",
        "[REDACTED_FINANCIAL]",
        re.compile(
            r"(?i)\b(?:cvv|cvc|ifsc|routing\s*(?:number|no)|account\s*(?:number|no))\s*(?:is|:|=)?\s*[A-Za-z0-9-]{3,18}\b"
        ),
    ),
    (
        "email",
        "pii",
        "[REDACTED_EMAIL]",
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ),
    (
        "phone_number",
        "pii",
        "[REDACTED_PHONE]",
        re.compile(r"(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)"),
    ),
]

_PRIVACY_ATTACK_PATTERNS: List[Pattern[str]] = [
    re.compile(r"(?i)\b(?:show|give|reveal|dump|tell)\s+(?:me\s+)?(?:other|another|all)\s+users?(?:'s|s')?\s+(?:data|memories|chats|messages|passwords|keys)\b"),
    re.compile(r"(?i)\b(?:ignore\s+previous\s+instructions|bypass\s+(?:auth|rls|privacy)|system\s+prompt|print\s+(?:env|api\s*key|service_role))\b"),
]


def _luhn_or_card_like(digits_only: str) -> bool:
    if not (13 <= len(digits_only) <= 19) or not digits_only.isdigit():
        return False
    total = 0
    reverse = digits_only[::-1]
    for i, ch in enumerate(reverse):
        n = int(ch)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


class PrivacyService:
    """Deterministic privacy guard for text, voice transcripts, memories, and logs."""

    def scan_text(self, text: str) -> PrivacyScanResult:
        if not text:
            return PrivacyScanResult(original_length=0, redacted_text="")

        redacted = text
        findings: List[PrivacyFinding] = []
        has_hard_secret = False
        has_financial = False
        has_pii = False

        for category, severity, tag, pattern in _DETECTION_RULES:
            def _replacer(match: re.Match[str], cat=category, sev=severity, t=tag) -> str:
                nonlocal has_hard_secret, has_financial, has_pii
                raw = match.group(0)
                if cat == "payment_card":
                    digits = re.sub(r"\D", "", raw)
                    if not _luhn_or_card_like(digits):
                        return raw
                if sev == "hard_secret":
                    has_hard_secret = True
                elif sev == "financial":
                    has_financial = True
                else:
                    has_pii = True
                findings.append(
                    PrivacyFinding(
                        category=cat,
                        severity=sev,
                        redaction_tag=t,
                        matched_preview=raw[:3] + "***",
                    )
                )
                return t

            redacted = pattern.sub(_replacer, redacted)

        is_attack = any(p.search(text) for p in _PRIVACY_ATTACK_PATTERNS)

        return PrivacyScanResult(
            original_length=len(text),
            redacted_text=redacted,
            findings=findings,
            has_hard_secret=has_hard_secret,
            has_financial=has_financial,
            has_pii=has_pii,
            is_privacy_attack=is_attack,
        )

    def redact_for_logging(self, text: str) -> str:
        """Always redact all secrets, financial data, and PII before logging or analytics."""
        return self.scan_text(text).redacted_text

    def is_memory_allowed(self, title: str, content: str) -> Tuple[bool, str]:
        """
        Never save passwords, API keys, authentication tokens, or financial secrets as memories.
        """
        combined = f"{title} {content}"
        scan = self.scan_text(combined)
        if scan.has_hard_secret:
            return (
                False,
                "Blocked saving secret credentials (password, API key, or token) as a memory.",
            )
        if scan.has_financial:
            return (
                False,
                "Blocked saving sensitive financial information as a memory.",
            )
        return True, "ok"

    def sanitize_memory_candidate(self, title: str, content: str) -> Tuple[str, str, bool]:
        """Returns (clean_title, clean_content, allowed)."""
        allowed, _ = self.is_memory_allowed(title, content)
        if not allowed:
            return title, content, False
        clean_title = self.scan_text(title).redacted_text
        clean_content = self.scan_text(content).redacted_text
        return clean_title, clean_content, True

    def sanitize_response(self, reply: str) -> str:
        """Prevents confidential credentials or raw secrets from appearing in AI responses."""
        if not reply:
            return reply
        scan = self.scan_text(reply)
        if scan.has_hard_secret or scan.has_financial:
            return scan.redacted_text
        return reply


privacy_service = PrivacyService()
