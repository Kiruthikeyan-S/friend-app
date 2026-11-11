"""
Memory Management Service Foundation (Phase 7)
Prepared for Supabase PostgreSQL storage with strict explicit user consent validation.
"""

import os
from typing import Any, Dict, Optional


class MemoryService:
    """
    Manages consent-based personal memories across categories:
    Profile, Preferences, Work, and Interests.
    """

    VALID_CATEGORIES = ("Profile", "Preferences", "Work", "Interests")

    def __init__(self) -> None:
        self.supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
        self.supabase_key: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    def is_configured(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_url.strip()
            and self.supabase_key
            and self.supabase_key.strip()
        )

    def get_status(self) -> Dict[str, Any]:
        return {
            "service": "memory",
            "provider": "Supabase PostgreSQL",
            "phase": "Phase 7 (Awaiting Integration)",
            "configured": self.is_configured(),
            "consent_required": True,
            "supported_categories": list(self.VALID_CATEGORIES),
        }

    async def validate_and_prepare_memory(
        self,
        category: str,
        title: str,
        content: str,
        explicit_user_consent: bool,
    ) -> Dict[str, Any]:
        """
        Enforces the core privacy rule: never save personal information without
        explicit user approval. Database persistence arrives in Phase 7.
        """
        if not explicit_user_consent:
            raise ValueError(
                "Explicit user approval is strictly required before saving any personal memory."
            )

        if category not in self.VALID_CATEGORIES:
            raise ValueError(
                f"Invalid category '{category}'. Must be one of {self.VALID_CATEGORIES}."
            )

        return {
            "status": "not_implemented",
            "phase": 7,
            "message": (
                "Consent verified. Supabase PostgreSQL persistence for personal memories "
                "is scheduled for Phase 7."
            ),
            "validated_payload": {
                "category": category,
                "title": title.strip(),
                "content": content.strip(),
                "explicit_user_consent": explicit_user_consent,
            },
        }


memory_service = MemoryService()
