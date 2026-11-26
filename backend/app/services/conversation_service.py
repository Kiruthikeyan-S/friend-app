"""
Conversation Management Service
Manages user-scoped conversations & messages with UTC timestamps,
7-day expiration for temporary chats, privacy redaction, and Supabase sync.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from .privacy_service import privacy_service


class ConversationService:
    """Manages per-user conversation history and temporary message retention."""

    def __init__(self) -> None:
        self._conversations: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._messages: Dict[str, List[Dict[str, Any]]] = {}

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
            "service": "conversation",
            "provider": "Supabase PostgreSQL (User-Scoped + 7-Day UTC Retention)",
            "configured": self.is_configured(),
        }

    def _now_utc(self) -> datetime:
        return datetime.now(timezone.utc)

    async def save_turn(
        self,
        user_id: str,
        conversation_id: str,
        user_message: str,
        assistant_reply: str,
        mode: str = "text",
        is_temporary: bool = True,
        retention_days: int = 7,
        audio_storage_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = self._now_utc()
        expires_at = (
            (now + timedelta(days=retention_days)).isoformat()
            if is_temporary
            else None
        )

        user_bucket = self._conversations.setdefault(user_id, {})
        redacted_user = privacy_service.redact_for_logging(user_message)
        redacted_assistant = privacy_service.redact_for_logging(assistant_reply)

        conv_record = {
            "id": conversation_id,
            "user_id": user_id,
            "title": redacted_user[:40] + ("..." if len(redacted_user) > 40 else ""),
            "mode": mode,
            "is_temporary": is_temporary,
            "expires_at": expires_at,
            "created_at": user_bucket.get(conversation_id, {}).get("created_at") or now.isoformat(),
            "updated_at": now.isoformat(),
        }
        user_bucket[conversation_id] = conv_record

        msg_list = self._messages.setdefault(conversation_id, [])
        user_msg_rec = {
            "id": f"msg-u-{uuid.uuid4().hex[:10]}",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": "user",
            "content": redacted_user,
            "redacted_content": redacted_user,
            "is_temporary": is_temporary,
            "audio_storage_path": audio_storage_path,
            "expires_at": expires_at,
            "created_at": now.strftime("%H:%M UTC"),
            "inserted_at": now.isoformat(),
        }
        assistant_msg_rec = {
            "id": f"msg-a-{uuid.uuid4().hex[:10]}",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": "assistant",
            "content": redacted_assistant,
            "redacted_content": redacted_assistant,
            "is_temporary": is_temporary,
            "audio_storage_path": None,
            "expires_at": expires_at,
            "created_at": now.strftime("%H:%M UTC"),
            "inserted_at": now.isoformat(),
        }
        msg_list.extend([user_msg_rec, assistant_msg_rec])

        if self.is_configured():
            await self._persist_supabase(conv_record, [user_msg_rec, assistant_msg_rec])

        return conv_record

    async def _persist_supabase(
        self, conversation: Dict[str, Any], messages: List[Dict[str, Any]]
    ) -> None:
        headers = {
            "apikey": self.supabase_service_key,
            "Authorization": f"Bearer {self.supabase_service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{self.supabase_url}/rest/v1/conversations",
                    headers=headers,
                    json=conversation,
                )
                await client.post(
                    f"{self.supabase_url}/rest/v1/messages",
                    headers=headers,
                    json=messages,
                )
        except Exception:
            pass

    async def list_conversations(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        if not user_id:
            return {"status": "ok", "conversations": []}
        now = self._now_utc()
        convs = []
        for rec in self._conversations.get(user_id, {}).values():
            exp = rec.get("expires_at")
            if exp and datetime.fromisoformat(exp) <= now:
                continue
            convs.append(rec)
        return {
            "status": "ok",
            "user_id": user_id,
            "conversations": convs,
        }

    def get_messages(self, user_id: str, conversation_id: str) -> List[Dict[str, Any]]:
        conv = self._conversations.get(user_id, {}).get(conversation_id)
        if not conv:
            return []
        return [
            m
            for m in self._messages.get(conversation_id, [])
            if m.get("user_id") == user_id
        ]

    def purge_expired_records(self, now_utc: Optional[datetime] = None) -> Dict[str, int]:
        now = now_utc or self._now_utc()
        deleted_conversations = 0
        deleted_messages = 0

        for user_id, bucket in list(self._conversations.items()):
            for conv_id in list(bucket.keys()):
                rec = bucket[conv_id]
                exp = rec.get("expires_at")
                updated = datetime.fromisoformat(rec["updated_at"])
                if (exp and datetime.fromisoformat(exp) <= now) or (
                    rec.get("is_temporary") and updated <= now - timedelta(days=7)
                ):
                    del bucket[conv_id]
                    deleted_conversations += 1

        for conv_id in list(self._messages.keys()):
            msgs = self._messages[conv_id]
            kept: List[Dict[str, Any]] = []
            for m in msgs:
                exp = m.get("expires_at")
                inserted = datetime.fromisoformat(m["inserted_at"])
                is_expired = (exp and datetime.fromisoformat(exp) <= now) or (
                    m.get("is_temporary") and inserted <= now - timedelta(days=7)
                )
                if is_expired:
                    deleted_messages += 1
                else:
                    kept.append(m)
            if kept:
                self._messages[conv_id] = kept
            else:
                del self._messages[conv_id]

        return {
            "deleted_conversations": deleted_conversations,
            "deleted_messages": deleted_messages,
        }


conversation_service = ConversationService()
