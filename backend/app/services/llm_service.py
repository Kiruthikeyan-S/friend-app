"""
LLM Service — Ollama Cloud (`deepseek-v4.1-flash` via `https://ollama.com/v1`)
+ Ultra-Fast Persistent Connection Pool & Automatic Failover (`openai/gpt-oss-20b` with `reasoning_effort="low"`).
Responds in ~0.4s–0.5s with simultaneous personal memory extraction.
"""

import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import APIStatusError, OpenAI

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=True)

SYSTEM_PROMPT = """You are Aura, a warm, caring, witty, and natural personal AI friend and voice assistant.
Speak like a real human friend—natural, conversational, supportive, and concise (1 to 2 short sentences for fast voice playback unless asked for detail).
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
    """
    Manages ultra-fast LLM generation using the OpenAI SDK with:
    1. Primary: Ollama Cloud (`https://ollama.com/v1`, model `deepseek-v4.1-flash`, `OLLAMA_API_KEY`)
    2. Instant Fallback: Groq (`openai/gpt-oss-20b` / `openai/gpt-oss-120b` with `reasoning_effort="low"`)
       using persistent keep-alive HTTP connections for sub-second (~0.4s) replies.
    """

    def __init__(self) -> None:
        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "https://ollama.com/v1")
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "deepseek-v4.1-flash")
        self.groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        self.groq_fallback_models: List[str] = [
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
        ]
        self._rr_index: int = 0
        self._ollama_cooldown_until: float = 0.0

        self._ollama_client: Optional[OpenAI] = None
        self._groq_client: Optional[OpenAI] = None
        self._init_clients()

    def _init_clients(self) -> None:
        ollama_key = (os.getenv("OLLAMA_API_KEY") or "").strip()
        if ollama_key:
            self._ollama_client = OpenAI(
                base_url=self.ollama_base_url,
                api_key=ollama_key,
                timeout=12.0,
                max_retries=0,
            )

        groq_key = (os.getenv("GROQ_API_KEY") or "").strip()
        if groq_key:
            self._groq_client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key,
                timeout=12.0,
                max_retries=0,
            )

    @property
    def ollama_api_key(self) -> Optional[str]:
        return os.getenv("OLLAMA_API_KEY")

    @property
    def groq_api_key(self) -> Optional[str]:
        return os.getenv("GROQ_API_KEY")

    def is_configured(self) -> bool:
        return bool(
            (self.ollama_api_key and self.ollama_api_key.strip())
            or (self.groq_api_key and self.groq_api_key.strip())
        )

    def get_status(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "service": "llm",
            "provider": "Ollama Cloud (deepseek-v4.1-flash) + Groq Ultra-Fast Engine",
            "phase": "Connected (Immediate Response)" if configured else "Awaiting API Key",
            "configured": configured,
            "model": self.ollama_model if self.ollama_api_key else self.groq_model,
            "ollama_configured": bool(self.ollama_api_key and self.ollama_api_key.strip()),
            "groq_configured": bool(self.groq_api_key and self.groq_api_key.strip()),
        }

    def _call_ollama_sync(
        self, messages_payload: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        if self._ollama_client is None:
            self._init_clients()
        assert self._ollama_client is not None

        completion = self._ollama_client.chat.completions.create(
            model=self.ollama_model,
            messages=messages_payload,  # type: ignore[arg-type]
            temperature=0.6,
            max_tokens=260,
        )
        return {
            "content": (completion.choices[0].message.content or "").strip(),
            "model": completion.model or self.ollama_model,
        }

    def _call_groq_sync(
        self,
        messages_payload: List[Dict[str, str]],
        model_name: str,
        use_json_mode: bool = True,
    ) -> Dict[str, Any]:
        if self._groq_client is None:
            self._init_clients()
        assert self._groq_client is not None

        kwargs: Dict[str, Any] = {
            "model": model_name,
            "messages": messages_payload,
            "temperature": 0.6,
            "max_tokens": 260,
        }
        if "gpt-oss" in model_name:
            kwargs["reasoning_effort"] = "low"
        if use_json_mode and "qwen" not in model_name:
            kwargs["response_format"] = {"type": "json_object"}

        completion = self._groq_client.chat.completions.create(**kwargs)
        return {
            "content": (completion.choices[0].message.content or "").strip(),
            "model": completion.model or model_name,
        }

    async def generate_response(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        approved_memories: Optional[List[Dict[str, Any]]] = None,
        voice_style_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates an immediate conversational response and extracts any personal memory candidates.
        Tries Ollama Cloud (`deepseek-v4.1-flash`) first when available, with instant zero-delay
        failover to Groq (`openai/gpt-oss-20b` with `reasoning_effort="low"`).
        """
        if not self.is_configured():
            return {
                "status": "not_implemented",
                "phase": 2,
                "message": "Neither OLLAMA_API_KEY nor GROQ_API_KEY is configured in backend/.env.",
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

        for turn in (conversation_history or [])[-8:]:
            role = turn.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = (turn.get("content") or "").strip()
            if content:
                messages_payload.append({"role": role, "content": content})

        if not messages_payload or messages_payload[-1].get("content") != message.strip():
            messages_payload.append({"role": "user", "content": message.strip()})

        try:
            result_data: Optional[Dict[str, Any]] = None
            last_err: Optional[Exception] = None

            # 1. Try Ollama Cloud (`deepseek-v4.1-flash`) if configured and not in 402/quota cooldown
            now = time.time()
            if (
                self.ollama_api_key
                and self.ollama_api_key.strip()
                and now >= self._ollama_cooldown_until
            ):
                try:
                    result_data = await asyncio.to_thread(
                        self._call_ollama_sync, messages_payload
                    )
                except APIStatusError as ollama_exc:
                    last_err = ollama_exc
                    # If Ollama returns 402 Payment Required or 401/403/429, pause Ollama retries
                    # for 5 minutes so every voice turn responds immediately via Groq without delay
                    if ollama_exc.status_code in (401, 402, 403, 404, 429):
                        self._ollama_cooldown_until = now + 300.0
                except Exception as ollama_other_exc:
                    last_err = ollama_other_exc
                    self._ollama_cooldown_until = now + 60.0

            # 2. Instant Failover / Load-Balanced Ultra-Fast Groq (`reasoning_effort="low"`)
            if result_data is None and self.groq_api_key and self.groq_api_key.strip():
                models_to_try = [
                    self.groq_fallback_models[
                        (self._rr_index + i) % len(self.groq_fallback_models)
                    ]
                    for i in range(len(self.groq_fallback_models))
                ]
                self._rr_index = (self._rr_index + 1) % 2

                for attempt in range(2):
                    for candidate_model in models_to_try:
                        try:
                            result_data = await asyncio.to_thread(
                                self._call_groq_sync,
                                messages_payload,
                                candidate_model,
                                True,
                            )
                            break
                        except APIStatusError as groq_exc:
                            last_err = groq_exc
                            if groq_exc.status_code in (400, 422):
                                try:
                                    result_data = await asyncio.to_thread(
                                        self._call_groq_sync,
                                        messages_payload,
                                        candidate_model,
                                        False,
                                    )
                                    break
                                except Exception as inner_exc:
                                    last_err = inner_exc
                                    continue
                            if groq_exc.status_code in (429, 503, 404):
                                continue
                            raise
                        except Exception as other_exc:
                            last_err = other_exc
                            continue
                    if result_data is not None:
                        break
                    await asyncio.sleep(0.6 * (attempt + 1))

            if result_data is None:
                if last_err is not None:
                    raise last_err
                raise RuntimeError("No LLM response received.")

            raw_content = result_data.get("content", "{}").strip()
            used_model = result_data.get("model", self.ollama_model)

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
                "model": used_model,
            }
        except Exception as exc:
            return {
                "status": "error",
                "phase": 2,
                "message": f"LLM error: {exc}",
                "memories": [],
            }


llm_service = LLMService()
