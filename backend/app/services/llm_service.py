"""
LLM Service (Fast Groq API Integration + Personal Memory & Voice Style Analysis)
Uses `openai/gpt-oss-20b` on Groq for sub-second conversational replies and
simultaneous personal memory extraction, with automatic multi-model fallback.
"""

import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=True)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are Aura, a warm, caring, witty, and natural personal AI friend and voice assistant.
Speak like a real human friend—natural, conversational, supportive, and concise (1 to 3 sentences unless asked for more detail).
Never sound like a stiff corporate bot.

You ALSO analyze what the user says to see if they shared any personal information, preferences, work details, or voice/style instructions.
Respond strictly in valid JSON with this exact schema:
{
  "reply": "Your natural, friendly conversational response to the user.",
  "memories": [
    {
      "category": "Profile" | "Preferences" | "Work" | "Interests",
      "title": "Short 2-4 word label (e.g., 'Name', 'Favorite Drink', 'Voice Style Preference')",
      "content": "Concise summary of the fact or preference the user shared.",
      "explicit_save": true
    }
  ]
}
Rules for "memories":
- Only include an item in "memories" if the user shared a personal fact, preference, work detail, interest, or how they want you to talk/sound.
- Set "explicit_save": true if the user directly told you a fact about themselves or asked you to remember/adapt to something; otherwise false.
- If no new personal fact was shared in this turn, return "memories": [].
"""


class LLMService:
    """Manages fast Groq LLM text generation, voice personality, and memory analysis."""

    def __init__(self) -> None:
        self.default_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        self.fallback_models: List[str] = [
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
        ]
        self._rr_index: int = 0

    @property
    def api_key(self) -> Optional[str]:
        return os.getenv("GROQ_API_KEY")

    def is_configured(self) -> bool:
        key = self.api_key
        return bool(key and key.strip())

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "service": "llm",
            "provider": "Groq API",
            "phase": "Connected (Ultra-Fast)" if configured else "Awaiting API Key",
            "configured": configured,
            "model": self.default_model,
        }

    def _call_groq_sync(
        self,
        messages_payload: List[Dict[str, str]],
        model_name: str,
        use_json_mode: bool = True,
    ) -> Dict[str, Any]:
        api_key = (self.api_key or "").strip()
        payload_dict: Dict[str, Any] = {
            "model": model_name,
            "messages": messages_payload,
            "temperature": 0.65,
            "max_tokens": 450,
        }
        if use_json_mode and "qwen" not in model_name:
            payload_dict["response_format"] = {"type": "json_object"}

        body = json.dumps(payload_dict).encode("utf-8")

        req = urllib.request.Request(
            GROQ_CHAT_COMPLETIONS_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "AuraPersonalAssistant/1.0",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=18) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw)

    async def generate_response(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        approved_memories: Optional[List[Dict[str, Any]]] = None,
        voice_style_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates a fast conversational response and extracts any personal memory candidates.
        """
        if not self.is_configured():
            return {
                "status": "not_implemented",
                "phase": 2,
                "message": "GROQ_API_KEY is not set in backend/.env.",
                "memories": [],
            }

        system_content = SYSTEM_PROMPT
        if voice_style_note:
            system_content += (
                f"\n\nUser's custom voice/personality training note: {voice_style_note}"
            )

        if approved_memories:
            memory_lines = [
                f"- [{m.get('category', 'Profile')}] {m.get('title', '')}: {m.get('content', '')}"
                for m in approved_memories
            ]
            system_content += (
                "\n\nWhat you already know & remember about the user:\n"
                + "\n".join(memory_lines)
            )

        messages_payload: List[Dict[str, str]] = [
            {"role": "system", "content": system_content}
        ]

        for turn in (conversation_history or [])[-10:]:
            role = turn.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = (turn.get("content") or "").strip()
            if content:
                messages_payload.append({"role": role, "content": content})

        if not messages_payload or messages_payload[-1].get("content") != message.strip():
            messages_payload.append({"role": "user", "content": message.strip()})

        try:
            data = None
            last_err: Optional[Exception] = None
            models_to_try = [
                self.fallback_models[(self._rr_index + i) % len(self.fallback_models)]
                for i in range(len(self.fallback_models))
            ]
            self._rr_index = (self._rr_index + 1) % 2  # Alternate 20b and 120b for double throughput

            for attempt in range(2):
                for candidate_model in models_to_try:
                    try:
                        data = await asyncio.to_thread(
                            self._call_groq_sync, messages_payload, candidate_model, True
                        )
                        break
                    except urllib.error.HTTPError as http_exc:
                        last_err = http_exc
                        if http_exc.code in (400, 422):
                            # Retry without response_format if model rejected json_object
                            try:
                                data = await asyncio.to_thread(
                                    self._call_groq_sync,
                                    messages_payload,
                                    candidate_model,
                                    False,
                                )
                                break
                            except Exception as inner_exc:
                                last_err = inner_exc
                                continue
                        if http_exc.code in (429, 503, 404):
                            continue
                        raise
                if data is not None:
                    break
                await asyncio.sleep(1.2 * (attempt + 1))

            if data is None and last_err is not None:
                raise last_err

            choices = (data or {}).get("choices") or []
            raw_content = (
                choices[0].get("message", {}).get("content", "").strip()
                if choices
                else "{}"
            )

            # Strip optional <think>...</think> or markdown code fences if present
            if "</think>" in raw_content:
                raw_content = raw_content.split("</think>")[-1].strip()
            if raw_content.startswith("```"):
                lines = raw_content.splitlines()
                if len(lines) >= 3:
                    raw_content = "\n".join(lines[1:-1]).strip()

            parsed_reply = raw_content
            extracted_memories: List[Dict[str, Any]] = []
            try:
                parsed_json = json.loads(raw_content)
                if isinstance(parsed_json, dict):
                    parsed_reply = str(parsed_json.get("reply") or "").strip()
                    raw_mems = parsed_json.get("memories")
                    if isinstance(raw_mems, list):
                        for item in raw_mems:
                            if (
                                isinstance(item, dict)
                                and item.get("title")
                                and item.get("content")
                            ):
                                cat = item.get("category", "Profile")
                                if cat not in (
                                    "Profile",
                                    "Preferences",
                                    "Work",
                                    "Interests",
                                ):
                                    cat = "Preferences"
                                extracted_memories.append(
                                    {
                                        "category": cat,
                                        "title": str(item["title"]).strip()[:80],
                                        "content": str(item["content"]).strip()[:300],
                                        "explicit_save": bool(
                                            item.get("explicit_save", True)
                                        ),
                                    }
                                )
            except Exception:
                parsed_reply = raw_content

            if not parsed_reply:
                parsed_reply = "I'm right here with you! Tell me more."

            return {
                "status": "ok",
                "phase": 2,
                "reply": parsed_reply,
                "memories": extracted_memories,
                "model": (data or {}).get("model", self.default_model),
            }
        except urllib.error.HTTPError as exc:
            err_detail = exc.read().decode("utf-8", errors="ignore")
            return {
                "status": "error",
                "phase": 2,
                "message": f"Groq API error ({exc.code}): {err_detail}",
                "memories": [],
            }
        except Exception as exc:
            return {
                "status": "error",
                "phase": 2,
                "message": f"Failed to reach Groq API: {exc}",
                "memories": [],
            }


llm_service = LLMService()
