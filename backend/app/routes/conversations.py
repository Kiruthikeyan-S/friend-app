"""Conversation history routes (JWT-authenticated, user-scoped)."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends

from ..services.authentication_service import (
    AuthenticatedUser,
    authentication_service,
    get_current_user,
)
from ..services.conversation_service import conversation_service

router = APIRouter(prefix="/api/v1/conversations", tags=["Conversation History"])


@router.get("/status")
async def get_conversation_service_status() -> Dict[str, Any]:
    return conversation_service.get_status()


@router.get("/")
async def list_conversations(
    user_id: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    authentication_service.assert_user_ownership(current_user.user_id, user_id)
    return await conversation_service.list_conversations(user_id=current_user.user_id)


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    msgs = conversation_service.get_messages(
        user_id=current_user.user_id, conversation_id=conversation_id
    )
    return {"status": "ok", "conversation_id": conversation_id, "messages": msgs}
