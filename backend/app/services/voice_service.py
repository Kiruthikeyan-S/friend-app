"""
Voice Processing Service (Ultra-Fast Persistent Connection Groq Whisper `whisper-large-v3-turbo`)
Transcribes recorded mobile audio in ~0.3s using a persistent HTTP keep-alive pool.
"""

import asyncio
import base64
import io
import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from openai import OpenAI

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=True)


class VoiceService:
    """Handles ultra-fast speech-to-text transcription using persistent connection pooling."""

    def __init__(self) -> None:
        self.stt_model: str = "whisper-large-v3-turbo"
        self.default_voice_id: str = os.getenv("TTS_VOICE_ID", "warm-calm")
        self._stt_client: Optional[OpenAI] = None
        self._init_client()

    def _init_client(self) -> None:
        key = (self.stt_api_key or "").strip()
        if key:
            self._stt_client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=key,
                timeout=15.0,
                max_retries=1,
            )

    @property
    def stt_api_key(self) -> Optional[str]:
        return os.getenv("WHISPER_API_KEY") or os.getenv("GROQ_API_KEY")

    def get_status(self) -> Dict[str, Any]:
        configured = bool(self.stt_api_key and self.stt_api_key.strip())
        return {
            "service": "voice",
            "stt": {
                "provider": "Groq Whisper Turbo (Persistent Pool)",
                "model": self.stt_model,
                "configured": configured,
            },
            "tts": {
                "provider": "Native Device Speech Engine (5 Personas via expo-speech)",
                "configured": True,
                "voice_id": self.default_voice_id,
            },
        }

    def _transcribe_bytes_sync(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language: str,
    ) -> str:
        if self._stt_client is None:
            self._init_client()
        assert self._stt_client is not None

        lang_short = (language or "en").split("-")[0].lower()
        file_tuple = (filename, io.BytesIO(audio_bytes), mime_type)

        transcription = self._stt_client.audio.transcriptions.create(
            model=self.stt_model,
            file=file_tuple,
            language=lang_short if lang_short else "en",
            response_format="json",
        )
        return str(getattr(transcription, "text", "") or "").strip()

    async def transcribe_base64_audio(
        self,
        audio_base64: str,
        filename: str = "speech.m4a",
        mime_type: str = "audio/m4a",
        language: str = "en-US",
    ) -> Dict[str, Any]:
        if not self.stt_api_key:
            return {
                "status": "error",
                "message": "Whisper API key is not configured.",
                "text": "",
            }

        try:
            clean_b64 = audio_base64.split(",")[-1].strip()
            audio_bytes = base64.b64decode(clean_b64)
            if len(audio_bytes) < 100:
                return {
                    "status": "error",
                    "message": "Recorded audio clip was too short or empty.",
                    "text": "",
                }

            transcript = await asyncio.to_thread(
                self._transcribe_bytes_sync,
                audio_bytes,
                filename,
                mime_type,
                language,
            )
            return {
                "status": "ok",
                "text": transcript,
                "language": language,
            }
        except Exception as exc:
            return {
                "status": "error",
                "message": f"Audio transcription failed: {exc}",
                "text": "",
            }


voice_service = VoiceService()
