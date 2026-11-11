"""Chat & LLM routes (Fast Groq AI + Personal Memory Analysis)."""

from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.llm_service import llm_service

router = APIRouter(prefix="/api/v1/chat", tags=["Chat & LLM"])


class ChatMessageInput(BaseModel):
    role: str = Field(..., description="Message sender role: 'user' or 'assistant'")
    content: str = Field(..., min_length=1, description="Message text")


class ApprovedMemoryInput(BaseModel):
    category: str
    title: str
    content: str


class ChatCompletionRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User input message")
    conversation_id: Optional[str] = Field(default=None)
    history: List[ChatMessageInput] = Field(default_factory=list)
    approved_memories: List[ApprovedMemoryInput] = Field(default_factory=list)
    voice_style_note: Optional[str] = Field(default=None)


@router.get("/status")
async def get_chat_service_status() -> Dict:
    return llm_service.get_status()


@router.post("/message")
async def send_chat_message(payload: ChatCompletionRequest) -> Dict:
    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
    memories_dicts = [
        {"category": m.category, "title": m.title, "content": m.content}
        for m in payload.approved_memories
    ]
    return await llm_service.generate_response(
        message=payload.message,
        conversation_history=history_dicts,
        approved_memories=memories_dicts,
        voice_style_note=payload.voice_style_note,
    )
