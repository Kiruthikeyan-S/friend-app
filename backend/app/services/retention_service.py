"""
Seven-Day Automatic Data Retention Service
Implements idempotent cleanup of expired conversations, temporary messages,
temporary memory candidates, and expired Supabase Storage audio files,
with safe retry handling and non-sensitive retention_logs recording.
"""

import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

import httpx

from .conversation_service import conversation_service
from .memory_service import memory_service


class RetentionService:
    """Handles scheduled & on-demand 7-day data retention cleanup."""

    def __init__(self) -> None:
        self._retention_logs: List[Dict[str, Any]] = []
        # Tracks temporary audio files (e.g. Supabase Storage paths + UTC timestamps)
        self._audio_registry: List[Dict[str, Any]] = []

    @property
    def supabase_url(self) -> str:
        return (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")

    @property
    def supabase_service_key(self) -> str:
        return (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    def register_audio_file(
        self,
        storage_path: str,
        user_id: str,
        created_at_utc: Optional[datetime] = None,
    ) -> None:
        ts = created_at_utc or datetime.now(timezone.utc)
        self._audio_registry.append(
            {
                "storage_path": storage_path,
                "user_id": user_id,
                "created_at": ts.isoformat(),
                "expires_at": (ts + timedelta(days=7)).isoformat(),
            }
        )

    async def _delete_storage_file_with_retry(
        self,
        storage_path: str,
        deleter: Optional[Callable[[str], Any]] = None,
        max_retries: int = 2,
    ) -> tuple[bool, int]:
        retries = 0
        for attempt in range(max_retries + 1):
            try:
                if deleter is not None:
                    result = deleter(storage_path)
                    if asyncio.iscoroutine(result):
                        await result
                    return True, retries
                if self.is_configured():
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        resp = await client.delete(
                            f"{self.supabase_url}/storage/v1/object/voice-audio/{storage_path}",
                            headers={
                                "apikey": self.supabase_service_key,
                                "Authorization": f"Bearer {self.supabase_service_key}",
                            },
                        )
                        if resp.status_code in (200, 204, 404):
                            return True, retries
                        raise RuntimeError(f"Storage delete HTTP {resp.status_code}")
                return True, retries
            except Exception:
                if attempt < max_retries:
                    retries += 1
                    await asyncio.sleep(0.05 * (attempt + 1))
                else:
                    return False, retries
        return False, retries

    async def run_cleanup(
        self,
        now_utc: Optional[datetime] = None,
        storage_deleter: Optional[Callable[[str], Any]] = None,
    ) -> Dict[str, Any]:
        """
        Idempotent 7-day retention cleanup.
        Preserves approved long-term memories without expiration.
        Records execution results in retention_logs without sensitive content.
        """
        now = now_utc or datetime.now(timezone.utc)
        total_retries = 0
        deleted_audio = 0
        failed_audio = 0
        error_summary: Optional[str] = None

        # 1. Purge expired local/tracked conversations & temporary messages
        conv_counts = conversation_service.purge_expired_records(now_utc=now)

        # 2. Purge expired temporary memory candidates (approved long-term memories stay)
        deleted_memories = memory_service.purge_expired_candidates(now_utc=now)

        # 3. Purge expired audio files from Supabase Storage with retry handling
        remaining_audio: List[Dict[str, Any]] = []
        for entry in self._audio_registry:
            exp = datetime.fromisoformat(entry["expires_at"])
            if exp <= now:
                ok, retries = await self._delete_storage_file_with_retry(
                    entry["storage_path"], deleter=storage_deleter
                )
                total_retries += retries
                if ok:
                    deleted_audio += 1
                else:
                    failed_audio += 1
                    remaining_audio.append(entry)
            else:
                remaining_audio.append(entry)
        self._audio_registry = remaining_audio

        # 4. Also invoke Supabase SQL RPC `run_seven_day_retention_cleanup` if configured
        if self.is_configured():
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    rpc_resp = await client.post(
                        f"{self.supabase_url}/rest/v1/rpc/run_seven_day_retention_cleanup",
                        headers={
                            "apikey": self.supabase_service_key,
                            "Authorization": f"Bearer {self.supabase_service_key}",
                            "Content-Type": "application/json",
                        },
                        json={},
                    )
                if rpc_resp.status_code == 200:
                    rpc_data = rpc_resp.json()
                    conv_counts["deleted_conversations"] += int(
                        rpc_data.get("deleted_conversations", 0)
                    )
                    conv_counts["deleted_messages"] += int(
                        rpc_data.get("deleted_messages", 0)
                    )
                    deleted_memories += int(
                        rpc_data.get("deleted_memory_candidates", 0)
                    )
            except Exception as exc:
                error_summary = f"Supabase RPC cleanup warning: {type(exc).__name__}"

        status_str = "success"
        if failed_audio > 0 or error_summary:
            status_str = "partial_failure"
            if failed_audio > 0:
                error_summary = f"{failed_audio} expired audio file(s) pending retry."

        log_entry = {
            "id": str(uuid.uuid4()),
            "run_at": now.isoformat(),
            "status": status_str,
            "deleted_conversations": conv_counts["deleted_conversations"],
            "deleted_messages": conv_counts["deleted_messages"],
            "deleted_memory_candidates": deleted_memories,
            "deleted_audio_files": deleted_audio,
            "retry_count": total_retries,
            "error_summary": error_summary,
        }
        self._retention_logs.append(log_entry)
        return log_entry

    def get_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self._retention_logs[-limit:]

    def get_status(self) -> Dict[str, Any]:
        return {
            "service": "retention",
            "policy_days": 7,
            "scheduler": "Supabase pg_cron (daily 03:00 UTC) + FastAPI RPC",
            "last_run": self._retention_logs[-1] if self._retention_logs else None,
        }


retention_service = RetentionService()
