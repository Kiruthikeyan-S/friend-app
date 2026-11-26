"""
Unified Secure Assistant Route (`/api/v1/assistant/respond`)
Handles both Text and Voice conversations through one JWT-authenticated,
Privacy-Guarded, Memory-Aware backend pipeline.
"""

from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..services.authentication_service import AuthenticatedUser, get_current_user
from ..services.conversation_service import conversation_service
from ..services.llm_service import llm_service
from ..services.memory_service import memory_service
from ..services.voice_service import voice_service

router = APIRouter(prefix="/api/v1/assistant", tags=["Unified Assistant"])


class HistoryTurn(BaseModel):
    role: str
    content: str


class ClientMemoryContext(BaseModel):
    category: str
    title: str
    content: str


class UnifiedRespondRequest(BaseModel):
    mode: Literal["text", "voice"] = Field(default="text")
    conversation_id: str = Field(default="default-session")
    message: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    filename: str = Field(default="speech.m4a")
    mime_type: str = Field(default="audio/m4a")
    language: str = Field(default="en-US")
    history: List[HistoryTurn] = Field(default_factory=list)
    approved_memories: List[ClientMemoryContext] = Field(default_factory=list)
    voice_style_note: Optional[str] = Field(default=None)
    response_length_preference: str = Field(default="concise")
    auto_save_memories: bool = Field(default=False)
    is_temporary: bool = Field(default=True)


@router.post("/respond")
async def unified_assistant_respond(
    payload: UnifiedRespondRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Single secure backend route for both Text and Voice AI processing:
    1. Verifies Supabase JWT user_id
    2. Transcribes & privacy-filters voice audio (if mode == 'voice')
    3. Retrieves relevant approved memories for this user
    4. Generates intent-aware, privacy-safe LLM response
    5. Filters & stores memory candidates + redacted conversation turn (7-day UTC TTL)
    """
    user_text = (payload.message or "").strip()
    transcript = ""

    if payload.mode == "voice":
        if not payload.audio_base64:
            return {
                "status": "error",
                "message": "audio_base64 is required for voice mode.",
                "transcript": "",
                "reply": "",
                "memories": [],
            }
        stt_result = await voice_service.transcribe_base64_audio(
            audio_base64=payload.audio_base64,
            filename=payload.filename,
            mime_type=payload.mime_type,
            language=payload.language,
        )
        if stt_result.get("status") != "ok":
            return {
                "status": "error",
                "message": stt_result.get("message", "Transcription failed."),
                "transcript": "",
                "reply": "",
                "memories": [],
            }
        transcript = str(stt_result.get("text") or "").strip()
        if not transcript:
            return {
                "status": "empty",
                "message": "No speech detected.",
                "transcript": "",
                "reply": "",
                "memories": [],
            }
        user_text = transcript

    if not user_text:
        return {
            "status": "empty",
            "message": "Message is empty.",
            "transcript": transcript,
            "reply": "",
            "memories": [],
        }

    # Combine server-side relevant memories + client-supplied approved memories (scoped to user)
    server_memories = memory_service.retrieve_relevant_memories(
        user_id=current_user.user_id,
        query=user_text,
        limit=6,
    )
    combined_memories: List[Dict[str, Any]] = [
        {"category": m["category"], "title": m["title"], "content": m["content"]}
        for m in server_memories
    ]
    seen_titles = {m["title"].lower() for m in combined_memories}
    for cm in payload.approved_memories:
        if cm.title.lower() not in seen_titles:
            combined_memories.append(
                {"category": cm.category, "title": cm.title, "content": cm.content}
            )
            seen_titles.add(cm.title.lower())

    history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]
    llm_result = await llm_service.generate_response(
        message=user_text,
        conversation_history=history_dicts,
        approved_memories=combined_memories,
        voice_style_note=payload.voice_style_note,
        mode=payload.mode,
        response_length_preference=payload.response_length_preference,
    )

    reply_text = str(llm_result.get("reply") or "").strip()
    extracted_raw = llm_result.get("memories") or []

    saved_candidates = await memory_service.extract_and_filter_candidates(
        user_id=current_user.user_id,
        raw_candidates=extracted_raw,
        auto_approve=payload.auto_save_memories,
    )

    if reply_text:
        await conversation_service.save_turn(
            user_id=current_user.user_id,
            conversation_id=payload.conversation_id,
            user_message=user_text,
            assistant_reply=reply_text,
            mode=payload.mode,
            is_temporary=payload.is_temporary,
        )

    return {
        "status": llm_result.get("status", "ok"),
        "mode": payload.mode,
        "intent": llm_result.get("intent", "qa"),
        "transcript": transcript,
        "reply": reply_text,
        "memories": saved_candidates,
        "model": llm_result.get("model", ""),
        "prompt_version": llm_result.get("prompt_version", ""),
        "latency_ms": llm_result.get("latency_ms", 0),
        "privacy_scan": llm_result.get("privacy_scan", {}),
        "message": llm_result.get("message", ""),
    }
