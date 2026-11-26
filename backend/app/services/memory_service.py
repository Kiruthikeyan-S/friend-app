"""
Memory Management Service
Consent-based personal memory extraction, deduplication, relevance retrieval,
6 structured categories, expiration support, privacy guard integration, and audit logging.
"""

import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from .privacy_service import privacy_service


MEMORY_CATEGORIES = (
    "Communication preferences",
    "Learning interests",
    "Skills and experience",
    "Ongoing projects",
    "Frequently used preferences",
    "User-approved personal context",
)

_LEGACY_CATEGORY_MAP = {
    "profile": "User-approved personal context",
    "preferences": "Frequently used preferences",
    "work": "Ongoing projects",
    "interests": "Learning interests",
    "communication preferences": "Communication preferences",
    "learning interests": "Learning interests",
    "skills and experience": "Skills and experience",
    "ongoing projects": "Ongoing projects",
    "frequently used preferences": "Frequently used preferences",
    "user-approved personal context": "User-approved personal context",
}


def normalize_memory_category(raw: Optional[str]) -> str:
    key = (raw or "").strip().lower()
    return _LEGACY_CATEGORY_MAP.get(key, "User-approved personal context")


class MemoryService:
    """Manages consent-based memories, audit logs, and relevance retrieval."""

    VALID_CATEGORIES = MEMORY_CATEGORIES

    def __init__(self) -> None:
        # In-memory store indexed by user_id for fast access & deterministic testing
        self._store: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._audit_logs: List[Dict[str, Any]] = []

    @property
    def supabase_url(self) -> str:
        return (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")

    @property
    def supabase_service_key(self) -> str:
        return (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    def get_status(self) -> Dict[str, Any]:
        return {
            "service": "memory",
            "provider": "Supabase PostgreSQL (RLS + Audit Logs)",
            "configured": self.is_configured(),
            "consent_required": True,
            "supported_categories": list(self.VALID_CATEGORIES),
        }

    def _now_utc(self) -> datetime:
        return datetime.now(timezone.utc)

    def _record_audit(
        self, user_id: str, memory_id: str, action: str, category: Optional[str] = None
    ) -> None:
        """Records audit metadata WITHOUT any sensitive memory content."""
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "memory_id": memory_id,
            "action": action,
            "category": category,
            "created_at": self._now_utc().isoformat(),
        }
        self._audit_logs.append(entry)

    async def _persist_memory_supabase(self, record: Dict[str, Any]) -> None:
        if not self.is_configured():
            return
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{self.supabase_url}/rest/v1/user_memories",
                    headers={
                        "apikey": self.supabase_service_key,
                        "Authorization": f"Bearer {self.supabase_service_key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates",
                    },
                    json=record,
                )
        except Exception:
            pass

    async def _delete_memory_supabase(self, user_id: str, memory_id: str) -> None:
        if not self.is_configured():
            return
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.delete(
                    f"{self.supabase_url}/rest/v1/user_memories?id=eq.{memory_id}&user_id=eq.{user_id}",
                    headers={
                        "apikey": self.supabase_service_key,
                        "Authorization": f"Bearer {self.supabase_service_key}",
                    },
                )
        except Exception:
            pass

    async def extract_and_filter_candidates(
        self,
        user_id: str,
        raw_candidates: List[Dict[str, Any]],
        auto_approve: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Filters extracted memory candidates through Privacy Guard, deduplicates against
        existing user memories, and sets status='pending' or 'approved'.
        """
        accepted: List[Dict[str, Any]] = []
        user_bucket = self._store.setdefault(user_id, {})
        now = self._now_utc()

        for cand in raw_candidates:
            raw_title = str(cand.get("title") or "").strip()
            raw_content = str(cand.get("content") or "").strip()
            if not raw_title or not raw_content:
                continue

            clean_title, clean_content, allowed = privacy_service.sanitize_memory_candidate(
                raw_title, raw_content
            )
            if not allowed:
                self._record_audit(user_id, "blocked", "redacted", normalize_memory_category(cand.get("category")))
                continue

            category = normalize_memory_category(cand.get("category"))
            explicit_save = bool(cand.get("explicit_save", False))
            status_val = "approved" if (auto_approve and explicit_save) else "pending"

            # Deduplicate by normalized title or content
            norm_title = re.sub(r"\W+", " ", clean_title.lower()).strip()
            existing_id: Optional[str] = None
            for mem_id, existing in user_bucket.items():
                if existing.get("status") == "rejected":
                    continue
                ex_title = re.sub(r"\W+", " ", existing["title"].lower()).strip()
                if ex_title == norm_title and existing["category"] == category:
                    existing_id = mem_id
                    break

            mem_id = existing_id or f"mem-{uuid.uuid4().hex[:12]}"
            expires_at = (
                None
                if status_val == "approved"
                else (now + timedelta(days=7)).isoformat()
            )

            record = {
                "id": mem_id,
                "user_id": user_id,
                "category": category,
                "title": clean_title[:80],
                "content": clean_content[:300],
                "status": status_val,
                "explicit_consent": status_val == "approved",
                "expires_at": expires_at,
                "created_at": user_bucket.get(mem_id, {}).get("created_at") or now.isoformat(),
                "updated_at": now.isoformat(),
            }
            user_bucket[mem_id] = record
            self._record_audit(
                user_id, mem_id, "approved" if status_val == "approved" else "extracted", category
            )
            await self._persist_memory_supabase(record)
            accepted.append(record)

        return accepted

    async def save_memory_with_consent(
        self,
        user_id: str,
        category: str,
        title: str,
        content: str,
        explicit_user_consent: bool,
        expires_in_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        if not explicit_user_consent:
            raise ValueError(
                "Explicit user approval is strictly required before saving any personal memory."
            )

        clean_title, clean_content, allowed = privacy_service.sanitize_memory_candidate(
            title, content
        )
        if not allowed:
            self._record_audit(user_id, "blocked", "redacted", category)
            raise ValueError(
                "Sensitive credentials or financial details cannot be saved as memories."
            )

        norm_cat = normalize_memory_category(category)
        now = self._now_utc()
        user_bucket = self._store.setdefault(user_id, {})

        # Deduplicate
        norm_title = re.sub(r"\W+", " ", clean_title.lower()).strip()
        mem_id = f"mem-{uuid.uuid4().hex[:12]}"
        for existing_id, existing in user_bucket.items():
            if (
                re.sub(r"\W+", " ", existing["title"].lower()).strip() == norm_title
                and existing["category"] == norm_cat
            ):
                mem_id = existing_id
                break

        expires_at = (
            (now + timedelta(days=expires_in_days)).isoformat()
            if expires_in_days is not None
            else None
        )

        record = {
            "id": mem_id,
            "user_id": user_id,
            "category": norm_cat,
            "title": clean_title.strip()[:80],
            "content": clean_content.strip()[:300],
            "status": "approved",
            "explicit_consent": True,
            "expires_at": expires_at,
            "created_at": user_bucket.get(mem_id, {}).get("created_at") or now.isoformat(),
            "updated_at": now.isoformat(),
        }
        user_bucket[mem_id] = record
        self._record_audit(user_id, mem_id, "approved", norm_cat)
        await self._persist_memory_supabase(record)
        return record

    async def approve_memory(self, user_id: str, memory_id: str) -> Dict[str, Any]:
        bucket = self._store.get(user_id, {})
        if memory_id not in bucket:
            raise KeyError("Memory not found for this user.")
        rec = bucket[memory_id]
        rec["status"] = "approved"
        rec["explicit_consent"] = True
        rec["expires_at"] = None
        rec["updated_at"] = self._now_utc().isoformat()
        self._record_audit(user_id, memory_id, "approved", rec["category"])
        await self._persist_memory_supabase(rec)
        return rec

    async def reject_memory(self, user_id: str, memory_id: str) -> Dict[str, Any]:
        bucket = self._store.get(user_id, {})
        if memory_id not in bucket:
            raise KeyError("Memory not found for this user.")
        rec = bucket[memory_id]
        rec["status"] = "rejected"
        rec["explicit_consent"] = False
        rec["expires_at"] = (self._now_utc() + timedelta(days=7)).isoformat()
        rec["updated_at"] = self._now_utc().isoformat()
        self._record_audit(user_id, memory_id, "rejected", rec["category"])
        await self._persist_memory_supabase(rec)
        return rec

    async def delete_memory(self, user_id: str, memory_id: str) -> bool:
        bucket = self._store.get(user_id, {})
        if memory_id not in bucket:
            return False
        cat = bucket[memory_id].get("category")
        del bucket[memory_id]
        self._record_audit(user_id, memory_id, "deleted", cat)
        await self._delete_memory_supabase(user_id, memory_id)
        return True

    def retrieve_relevant_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 8,
    ) -> List[Dict[str, Any]]:
        """Retrieves approved, non-expired memories for a specific user ranked by relevance."""
        bucket = self._store.get(user_id, {})
        now = self._now_utc()
        query_tokens = set(re.findall(r"\w+", query.lower()))

        scored: List[tuple[int, Dict[str, Any]]] = []
        for rec in bucket.values():
            if rec.get("status") != "approved" or not rec.get("explicit_consent"):
                continue
            exp = rec.get("expires_at")
            if exp and datetime.fromisoformat(exp) <= now:
                continue
            mem_tokens = set(
                re.findall(r"\w+", f"{rec['title']} {rec['content']} {rec['category']}".lower())
            )
            overlap = len(query_tokens & mem_tokens)
            # Always keep Communication preferences & User-approved personal context high priority
            bonus = 2 if rec["category"] in (
                "Communication preferences",
                "User-approved personal context",
            ) else 0
            scored.append((overlap + bonus, rec))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item[1] for item in scored[:limit]]

    def list_user_memories(self, user_id: str, include_pending: bool = True) -> List[Dict[str, Any]]:
        bucket = self._store.get(user_id, {})
        items = list(bucket.values())
        if not include_pending:
            items = [m for m in items if m.get("status") == "approved"]
        return items

    def purge_expired_candidates(self, now_utc: Optional[datetime] = None) -> int:
        """Deletes expired temporary/pending memory candidates while preserving approved long-term memories."""
        now = now_utc or self._now_utc()
        removed = 0
        for user_id, bucket in list(self._store.items()):
            for mem_id in list(bucket.keys()):
                rec = bucket[mem_id]
                exp = rec.get("expires_at")
                status_val = rec.get("status")
                created_dt = datetime.fromisoformat(rec["created_at"])
                is_expired_by_ts = bool(exp and datetime.fromisoformat(exp) <= now)
                is_stale_pending = (
                    status_val in ("pending", "rejected")
                    and created_dt <= now - timedelta(days=7)
                )
                if is_expired_by_ts or is_stale_pending:
                    cat = rec.get("category")
                    del bucket[mem_id]
                    self._record_audit(user_id, mem_id, "expired", cat)
                    removed += 1
        return removed

    async def validate_and_prepare_memory(
        self,
        category: str,
        title: str,
        content: str,
        explicit_user_consent: bool,
    ) -> Dict[str, Any]:
        if not explicit_user_consent:
            raise ValueError(
                "Explicit user approval is strictly required before saving any personal memory."
            )
        clean_title, clean_content, allowed = privacy_service.sanitize_memory_candidate(
            title, content
        )
        if not allowed:
            raise ValueError(
                "Sensitive credentials or financial details cannot be saved as memories."
            )
        return {
            "status": "ok",
            "validated_payload": {
                "category": normalize_memory_category(category),
                "title": clean_title.strip(),
                "content": clean_content.strip(),
                "explicit_user_consent": explicit_user_consent,
            },
        }


memory_service = MemoryService()
