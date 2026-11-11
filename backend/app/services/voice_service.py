"""
Voice Processing Service (Real Groq Whisper Speech-to-Text `whisper-large-v3-turbo`)
Transcribes recorded mobile audio via Groq's ultra-fast Whisper API.
"""

import asyncio
import base64
import json
import os
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=True)

GROQ_AUDIO_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


class VoiceService:
    """Handles fast speech-to-text transcription using Groq Whisper."""

    def __init__(self) -> None:
        self.stt_model: str = "whisper-large-v3-turbo"
        self.default_voice_id: str = os.getenv("TTS_VOICE_ID", "warm-calm")

    @property
    def stt_api_key(self) -> Optional[str]:
        return os.getenv("WHISPER_API_KEY") or os.getenv("GROQ_API_KEY")

    def get_status(self) -> Dict[str, Any]:
        configured = bool(self.stt_api_key and self.stt_api_key.strip())
        return {
            "service": "voice",
            "stt": {
                "provider": "Groq Whisper Turbo",
                "model": self.stt_model,
                "configured": configured,
            },
            "tts": {
                "provider": "Native Device Speech Engine (expo-speech)",
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
        api_key = (self.stt_api_key or "").strip()
        boundary = f"----AuraVoiceBoundary{uuid.uuid4().hex}"
        lang_short = (language or "en").split("-")[0].lower()

        parts: list[bytes] = []

        def add_field(name: str, value: str) -> None:
            parts.append(f"--{boundary}\r\n".encode("utf-8"))
            parts.append(
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode(
                    "utf-8"
                )
            )

        add_field("model", self.stt_model)
        if lang_short:
            add_field("language", lang_short)
        add_field("response_format", "json")

        # File part
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(
            (
                f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
                f"Content-Type: {mime_type}\r\n\r\n"
            ).encode("utf-8")
        )
        parts.append(audio_bytes)
        parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))

        body = b"".join(parts)

        req = urllib.request.Request(
            GROQ_AUDIO_TRANSCRIPTIONS_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "AuraPersonalAssistant/1.0",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            return str(parsed.get("text") or "").strip()

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
                "message": "Groq Whisper API key is not configured.",
                "text": "",
            }

        try:
            # Strip optional data URL prefix if present
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
        except urllib.error.HTTPError as exc:
            err_detail = exc.read().decode("utf-8", errors="ignore")
            return {
                "status": "error",
                "message": f"Whisper STT error ({exc.code}): {err_detail}",
                "text": "",
            }
        except Exception as exc:
            return {
                "status": "error",
                "message": f"Audio transcription failed: {exc}",
                "text": "",
            }


voice_service = VoiceService()
