"""
Personal AI Voice Assistant - FastAPI Backend Foundation (Phase 1)
Provides health checks, basic API status, and modular service/route architecture
prepared for Phases 2 through 10.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import chat, conversations, memory, voice
from .services.conversation_service import conversation_service
from .services.llm_service import llm_service
from .services.memory_service import memory_service
from .services.voice_service import voice_service

load_dotenv()

app = FastAPI(
    title="Personal AI Voice Assistant API",
    description=(
        "Phase 1 Backend Foundation for the Personal AI Voice Assistant. "
        "Prepared for Groq LLM, Whisper STT, TTS, Firebase Auth, and Supabase PostgreSQL."
    ),
    version="0.1.0-phase1",
)

cors_origins_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(memory.router)
app.include_router(conversations.router)


@app.get("/", tags=["Status"])
async def root_status() -> Dict[str, Any]:
    """Basic API status and Phase 1 architectural overview."""
    return {
        "name": "Personal AI Voice Assistant API",
        "phase": "Phase 1 - Foundation & UI Architecture",
        "status": "online",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "documentation": "/docs",
        "services": {
            "llm": llm_service.get_status(),
            "voice": voice_service.get_status(),
            "memory": memory_service.get_status(),
            "conversations": conversation_service.get_status(),
        },
        "roadmap": {
            "phase_1": "Mobile UI, navigation, consent-based memory UX, and FastAPI foundation (Active)",
            "phase_2": "Groq LLM integration and text chatbot",
            "phase_3": "Whisper Speech-to-Text voice input",
            "phase_4": "Text-to-Speech voice output",
            "phase_5": "Natural and friendly conversation personality",
            "phase_6": "Firebase Authentication",
            "phase_7": "Consent-based personal memory using Supabase PostgreSQL",
            "phase_8": "Conversation history and contextual memory",
            "phase_9": "AI tool calling and agent capabilities",
            "phase_10": "Security, testing, and deployment",
        },
    }


@app.get("/health", tags=["Status"])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint used by the mobile client and deployment monitors."""
    return {
        "status": "healthy",
        "service": "personal-ai-voice-assistant-backend",
        "phase": 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
