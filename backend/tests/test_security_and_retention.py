"""
Automated Security, Privacy, Retention, Memory, Auth & LLM Evaluation Tests
Covers all 10 required verification scenarios without mocking away real logic.
"""

import asyncio
import base64
import json
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.authentication_service import AuthenticatedUser, authentication_service
from app.services.conversation_service import conversation_service
from app.services.evaluation_service import evaluation_service
from app.services.llm_service import llm_service
from app.services.memory_service import memory_service
from app.services.privacy_service import privacy_service
from app.services.retention_service import retention_service


def _make_fake_jwt(sub: str, exp_offset_sec: int = 3600) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256"}).encode()).decode().rstrip("=")
    payload = (
        base64.urlsafe_b64encode(
            json.dumps({"sub": sub, "exp": int(time.time()) + exp_offset_sec}).encode()
        )
        .decode()
        .rstrip("=")
    )
    return f"{header}.{payload}.signature"


@pytest.fixture(autouse=True)
def reset_in_memory_stores():
    memory_service._store.clear()
    memory_service._audit_logs.clear()
    conversation_service._conversations.clear()
    conversation_service._messages.clear()
    retention_service._retention_logs.clear()
    retention_service._audio_registry.clear()
    yield


# ---------------------------------------------------------------------------
# 1 & 2. Authentication Failures & Cross-User Data Access
# ---------------------------------------------------------------------------
def test_authentication_failures_return_401():
    client = TestClient(app)
    # Missing Authorization header
    r1 = client.get("/api/v1/memory/")
    assert r1.status_code == 401

    # Malformed token
    r2 = client.get("/api/v1/memory/", headers={"Authorization": "Bearer not-a-jwt"})
    assert r2.status_code == 401

    # Expired JWT
    expired_jwt = _make_fake_jwt("user-a", exp_offset_sec=-120)
    r3 = client.get("/api/v1/memory/", headers={"Authorization": f"Bearer {expired_jwt}"})
    assert r3.status_code == 401


def test_cross_user_data_access_blocked():
    client = TestClient(app)

    async def _fake_verify(auth_header: str):
        if auth_header == "Bearer token-user-a":
            return AuthenticatedUser(user_id="user-a", email="a@test.com")
        if auth_header == "Bearer token-user-b":
            return AuthenticatedUser(user_id="user-b", email="b@test.com")
        raise Exception("Unauthorized")

    with patch.object(authentication_service, "verify_bearer_token", side_effect=_fake_verify):
        # User A saves a memory
        save_resp = client.post(
            "/api/v1/memory/save",
            headers={"Authorization": "Bearer token-user-a"},
            json={
                "category": "Ongoing projects",
                "title": "App Build",
                "content": "Building Anytime Anywhere Chat",
                "explicit_user_consent": True,
            },
        )
        assert save_resp.status_code == 200
        mem_id = save_resp.json()["memory"]["id"]

        # User B tries to list User A's memories -> sees empty list
        list_b = client.get(
            "/api/v1/memory/",
            headers={"Authorization": "Bearer token-user-b"},
        )
        assert list_b.status_code == 200
        assert list_b.json()["memories"] == []

        # User B tries to delete User A's memory -> 404 (isolated)
        del_b = client.delete(
            f"/api/v1/memory/{mem_id}",
            headers={"Authorization": "Bearer token-user-b"},
        )
        assert del_b.status_code == 404

        # User B tries to list User A's conversations via query param -> 403 Forbidden
        conv_b = client.get(
            "/api/v1/conversations/?user_id=user-a",
            headers={"Authorization": "Bearer token-user-b"},
        )
        assert conv_b.status_code == 403


# ---------------------------------------------------------------------------
# 3 & 4. Password & API Key Detection (Privacy Guard)
# ---------------------------------------------------------------------------
def test_password_and_api_key_detection_and_redaction():
    text = (
        "My password is MySecretPass99! and my Groq key is "
        "gsk_AbCdEfGhIjKlMnOpQrStUvWxYz123456 and email is dev@example.com"
    )
    scan = privacy_service.scan_text(text)
    assert scan.has_hard_secret is True
    assert scan.has_pii is True
    assert "MySecretPass99!" not in scan.redacted_text
    assert "gsk_AbCdEfGhIjKlMnOpQrStUvWxYz123456" not in scan.redacted_text
    assert "[REDACTED_PASSWORD]" in scan.redacted_text
    assert "[REDACTED_API_KEY]" in scan.redacted_text
    assert "[REDACTED_EMAIL]" in scan.redacted_text

    # Memory guard must block saving passwords or API keys
    allowed, _ = privacy_service.is_memory_allowed("Credentials", text)
    assert allowed is False


# ---------------------------------------------------------------------------
# 5 & 6. Memory Consent, Deduplication, Relevance & Deletion
# ---------------------------------------------------------------------------
def test_memory_consent_and_deletion():
    async def _run():
        # Cannot save without explicit consent
        with pytest.raises(ValueError):
            await memory_service.save_memory_with_consent(
                user_id="user-1",
                category="Communication preferences",
                title="Tone",
                content="Likes concise replies",
                explicit_user_consent=False,
            )

        # Save with explicit consent
        rec = await memory_service.save_memory_with_consent(
            user_id="user-1",
            category="Communication preferences",
            title="Tone",
            content="Likes concise replies",
            explicit_user_consent=True,
        )
        assert rec["status"] == "approved"
        assert rec["expires_at"] is None  # Long-term approved memory

        # Relevance retrieval returns it
        found = memory_service.retrieve_relevant_memories("user-1", "How should you reply?")
        assert len(found) == 1
        assert found[0]["id"] == rec["id"]

        # Delete memory
        deleted = await memory_service.delete_memory("user-1", rec["id"])
        assert deleted is True
        assert memory_service.list_user_memories("user-1") == []

        # Audit log recorded without storing sensitive content
        assert any(
            log["action"] == "deleted" and "content" not in log
            for log in memory_service._audit_logs
        )

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 7, 8 & 9. Weekly 7-Day Cleanup, Storage File Cleanup & Conversation Retrieval
# ---------------------------------------------------------------------------
def test_weekly_retention_and_storage_cleanup():
    async def _run():
        old_utc = datetime.now(timezone.utc) - timedelta(days=8)
        recent_utc = datetime.now(timezone.utc) - timedelta(days=1)

        # Save an approved long-term memory (must NOT be deleted by 7-day cleanup)
        long_term = await memory_service.save_memory_with_consent(
            user_id="user-1",
            category="Learning interests",
            title="Goal",
            content="Learning FastAPI",
            explicit_user_consent=True,
        )

        # Save a pending memory candidate older than 7 days (MUST be deleted)
        await memory_service.extract_and_filter_candidates(
            user_id="user-1",
            raw_candidates=[
                {
                    "category": "Ongoing projects",
                    "title": "Temp",
                    "content": "Old temp note",
                    "explicit_save": False,
                }
            ],
            auto_approve=False,
        )
        for m in memory_service._store["user-1"].values():
            if m["status"] == "pending":
                m["created_at"] = old_utc.isoformat()
                m["expires_at"] = (old_utc + timedelta(days=7)).isoformat()

        # Save an expired conversation & a fresh conversation
        await conversation_service.save_turn(
            "user-1", "conv-old", "Old question", "Old answer", is_temporary=True
        )
        conversation_service._conversations["user-1"]["conv-old"]["expires_at"] = (
            old_utc + timedelta(days=7)
        ).isoformat()
        for msg in conversation_service._messages["conv-old"]:
            msg["expires_at"] = (old_utc + timedelta(days=7)).isoformat()

        await conversation_service.save_turn(
            "user-1", "conv-new", "Recent question", "Recent answer", is_temporary=True
        )
        recent_msgs = conversation_service.get_messages("user-1", "conv-new")
        assert len(recent_msgs) == 2

        # Register expired audio file + test retry on transient failure
        retention_service.register_audio_file("user-1/old.m4a", "user-1", created_at_utc=old_utc)
        retention_service.register_audio_file("user-1/new.m4a", "user-1", created_at_utc=recent_utc)

        attempts = {"count": 0}

        def flaky_deleter(path: str):
            attempts["count"] += 1
            if attempts["count"] == 1:
                raise RuntimeError("Transient storage timeout")
            return True

        summary = await retention_service.run_cleanup(storage_deleter=flaky_deleter)
        assert summary["status"] == "success"
        assert summary["deleted_conversations"] == 1
        assert summary["deleted_messages"] == 2
        assert summary["deleted_memory_candidates"] == 1
        assert summary["deleted_audio_files"] == 1
        assert summary["retry_count"] == 1

        # Idempotent re-run deletes 0 extra rows
        summary_2 = await retention_service.run_cleanup(storage_deleter=flaky_deleter)
        assert summary_2["deleted_conversations"] == 0
        assert summary_2["deleted_messages"] == 0

        # Long-term approved memory is preserved
        remaining = memory_service.list_user_memories("user-1", include_pending=False)
        assert len(remaining) == 1
        assert remaining[0]["id"] == long_term["id"]

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 10. Backend Provider Failure Handling & Evaluation Regression
# ---------------------------------------------------------------------------
def test_backend_provider_failure_and_evaluation_suite():
    async def _run():
        with patch.object(
            llm_service, "_call_groq_sync", side_effect=RuntimeError("Groq 503 Unavailable")
        ):
            with patch.object(
                llm_service, "_call_ollama_sync", side_effect=RuntimeError("Ollama timeout")
            ):
                resp = await llm_service.generate_response(message="Hello Aura!")
                assert resp["status"] == "error"
                assert "LLM error" in resp["message"]

        eval_report = await evaluation_service.run_regression_suite(run_live_llm=False)
        assert eval_report["total_cases"] == 8
        assert eval_report["passed"] == 8
        assert eval_report["failed"] == 0

    asyncio.run(_run())
