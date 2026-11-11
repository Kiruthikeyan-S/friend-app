"""Conversation history routes (Prepared for Phase 8 Supabase storage)."""

from typing import Dict, Optional
from fastapi import APIRouter

from ..services.conversation_service import conversation_service

router = APIRouter(prefix="/api/v1/conversations", tags=["Conversation History"])


@router.get("/status")
async def get_conversation_service_status() -> Dict:
    """Inspect Phase 8 conversation history service readiness."""
    return conversation_service.get_status()


@router.get("/")
async def list_conversations(user_id: Optional[str] = None) -> Dict:
    """Phase 8 endpoint foundation for listing saved conversations."""
    return await conversation_service.list_conversations(user_id=user_id)
