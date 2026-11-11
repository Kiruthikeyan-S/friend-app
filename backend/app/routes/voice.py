"""
Voice processing routes (Real Groq Whisper STT + Combined Voice Conversation Turn).
"""

from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.llm_service import llm_service
from ..services.voice_service import voice_service

router = APIRouter(prefix="/api/v1/voice", tags=["Voice (STT, LLM & Memory)"])


class ChatTurnInput(BaseModel):
    role: str
    content: str


class MemoryContextInput(BaseModel):
    category: str
    title: str
    content: str


class VoiceTalkRequest(BaseModel):
    audio_base64: str = Field(..., min_length=16, description="Base64 encoded audio file")
    filename: str = Field(default="speech.m4a")
    mime_type: str = Field(default="audio/m4a")
    language: str = Field(default="en-US")
    history: List[ChatTurnInput] = Field(default_factory=list)
    approved_memories: List[MemoryContextInput] = Field(default_factory=list)
    voice_style_note: Optional[str] = Field(default=None)


class TranscribeBase64Request(BaseModel):
    audio_base64: str = Field(..., min_length=16)
    filename: str = Field(default="speech.m4a")
    mime_type: str = Field(default="audio/m4a")
    language: str = Field(default="en-US")


@router.get("/status")
async def get_voice_service_status() -> Dict:
    return voice_service.get_status()


@router.post("/transcribe")
async def transcribe_speech(payload: TranscribeBase64Request) -> Dict:
    """Transcribes base64 audio using Groq Whisper Turbo."""
    return await voice_service.transcribe_base64_audio(
        audio_base64=payload.audio_base64,
        filename=payload.filename,
        mime_type=payload.mime_type,
        language=payload.language,
    )


@router.post("/talk")
async def voice_conversation_turn(payload: VoiceTalkRequest) -> Dict:
    """
    Single-round-trip voice pipeline:
    1. Transcribes user speech via Groq `whisper-large-v3-turbo`
    2. Generates friendly reply & analyzes personal memory via Groq `openai/gpt-oss-20b`
    """
    stt_result = await voice_service.transcribe_base64_audio(
        audio_base64=payload.audio_base64,
        filename=payload.filename,
        mime_type=payload.mime_type,
        language=payload.language,
    )

    if stt_result.get("status") != "ok":
        return {
            "status": "error",
            "message": stt_result.get("message", "Could not transcribe audio."),
            "transcript": "",
            "reply": "",
            "memories": [],
        }

    transcript = str(stt_result.get("text") or "").strip()
    if not transcript:
        return {
            "status": "empty",
            "message": "I didn't catch any speech—feel free to speak again!",
            "transcript": "",
            "reply": "",
            "memories": [],
        }

    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
    memories_dicts = [
        {"category": m.category, "title": m.title, "content": m.content}
        for m in payload.approved_memories
    ]

    llm_result = await llm_service.generate_response(
        message=transcript,
        conversation_history=history_dicts,
        approved_memories=memories_dicts,
        voice_style_note=payload.voice_style_note,
    )

    return {
        "status": llm_result.get("status", "ok"),
        "transcript": transcript,
        "reply": llm_result.get("reply", ""),
        "memories": llm_result.get("memories", []),
        "model": llm_result.get("model", ""),
        "message": llm_result.get("message", ""),
    }
