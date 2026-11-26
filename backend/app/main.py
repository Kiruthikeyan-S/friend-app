"""
Aura Personal AI Assistant — FastAPI Backend
Modular, JWT-authenticated, Privacy-Guarded, 7-Day Retention Architecture.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import assistant, chat, conversations, memory, system_ops, voice
from .services.authentication_service import authentication_service
from .services.conversation_service import conversation_service
from .services.llm_service import llm_service
from .services.memory_service import memory_service
from .services.retention_service import retention_service
from .services.voice_service import voice_service

load_dotenv()

app = FastAPI(
    title="Anytime Anywhere Chat (Aura AI) API",
    description=(
        "Secure FastAPI backend with Supabase JWT Auth, Privacy Guard, "
        "Consent-Based Memory, 7-Day UTC Retention, and Groq Whisper + LLM."
    ),
    version="3.0.0",
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

app.include_router(assistant.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(memory.router)
app.include_router(conversations.router)
app.include_router(system_ops.retention_router)
app.include_router(system_ops.evaluation_router)


@app.get("/", tags=["Status"])
async def root_status() -> Dict[str, Any]:
    return {
        "name": "Anytime Anywhere Chat (Aura AI) API",
        "status": "online",
        "version": "3.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "authentication": authentication_service.get_status(),
            "llm": llm_service.get_status(),
            "voice": voice_service.get_status(),
            "memory": memory_service.get_status(),
            "conversations": conversation_service.get_status(),
            "retention": retention_service.get_status(),
        },
    }


@app.get("/health", tags=["Status"])
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "aura-personal-ai-backend",
        "version": "3.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
