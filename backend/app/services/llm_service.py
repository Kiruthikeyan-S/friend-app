"""
LLM Service — Versioned System Prompt (aura-v3.0), Intent Understanding,
Privacy-Safe Context Injection, Anti-Repetition, and Configurable Model Settings.
Supports both Text and Voice conversations consistently.
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import APIStatusError, OpenAI

from .memory_service import normalize_memory_category
from .privacy_service import privacy_service

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=True)

PROMPT_VERSION = "aura-v3.0"


@dataclass
class LLMModelConfig:
    prompt_version: str = PROMPT_VERSION
    primary_provider: str = "ollama_or_groq"
    groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.55"))
    max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "1200"))
    reasoning_effort: str = os.getenv("LLM_REASONING_EFFORT", "low")


SYSTEM_PROMPT_V3 = """You are Aura (Prompt Version: aura-v3.0), a warm, emotionally intelligent, helpful personal AI friend.

CORE BEHAVIOR RULES:
1. Understand the user's true intent BEFORE answering. Answer the exact question directly without unrelated filler.
2. Maintain full conversation context across turns.
3. Sound natural, friendly, and human—never robotic or repetitive. Vary your phrasing if recent assistant replies used similar openers.
4. ADAPTIVE ANSWER LENGTH:
   - If the user explicitly asks for a short/brief/one-line answer (e.g. "short", "briefly", "in short", "tldr", "quick"), OR it is a simple greeting/yes-no, give a short, crisp 1-3 sentence reply.
   - If the user asks a big, broad, or descriptive question (e.g., about a movie, Earth, space, science, travel/places, history, how something works, "tell me about...", "explain..."), give a rich, detailed, thorough answer with well-organized points, context, and helpful examples.
   - In Voice mode, keep answers natural for listening (still detailed when asked about a big topic, concise for quick chat).
5. If a request is ambiguous or missing key details, ask ONE short, friendly clarifying question instead of guessing.
6. Never fabricate facts, file paths, or unsupported claims. If you do not know something, say so honestly.
7. Respond naturally in the same language the user uses (including English and Tamil).
8. NEVER mention, assume, or guess any country or timezone based on voice persona.
9. PRIVACY GUARD: Never echo back passwords, API keys, access tokens, or card numbers. If the user shares a secret credential, gently remind them not to store secrets and do NOT include any secret in "memories".

MEMORY EXTRACTION SCHEMA:
Allowed categories:
- "Communication preferences"
- "Learning interests"
- "Skills and experience"
- "Ongoing projects"
- "Frequently used preferences"
- "User-approved personal context"

Rules for "memories":
- Only extract useful, lasting personal facts or preferences.
- NEVER extract temporary greetings, one-off questions, passwords, API keys, tokens, or financial secrets.
- Set "explicit_save": true only if the user explicitly asked to remember it or shared a clear lasting personal fact.

Respond strictly in valid JSON:
{
  "intent": "qa|clarification_needed|casual_chat|task_help|memory_command|emotional_support|privacy_refusal",
  "reply": "Your natural, helpful response.",
  "memories": [
    {
      "category": "Communication preferences|Learning interests|Skills and experience|Ongoing projects|Frequently used preferences|User-approved personal context",
      "title": "Short 2-4 word label",
      "content": "Concise 1-sentence fact without secrets",
      "explicit_save": true
    }
  ]
}"""


class LLMService:
    """Manages versioned, privacy-aware LLM generation with instant failover."""

    def __init__(self, config: Optional[LLMModelConfig] = None) -> None:
        self.config = config or LLMModelConfig()
        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "https://ollama.com/v1")
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "deepseek-v4.1-flash")
        self.groq_model: str = self.config.groq_model
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
            "prompt_version": self.config.prompt_version,
            "provider": "Groq + Ollama Cloud Failover",
            "configured": configured,
            "model": self.groq_model,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }

    def _call_ollama_sync(self, messages_payload: List[Dict[str, str]]) -> Dict[str, Any]:
        if self._ollama_client is None:
            self._init_clients()
        assert self._ollama_client is not None

        completion = self._ollama_client.chat.completions.create(
            model=self.ollama_model,
            messages=messages_payload,  # type: ignore[arg-type]
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
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
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }
        if "gpt-oss" in model_name:
            kwargs["reasoning_effort"] = self.config.reasoning_effort
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
        mode: str = "text",
        response_length_preference: str = "adaptive",
    ) -> Dict[str, Any]:
        started = time.perf_counter()

        # 1. Deterministic Privacy Guard on incoming user text / transcript
        scan = privacy_service.scan_text(message)
        if scan.is_privacy_attack:
            return {
                "status": "ok",
                "intent": "privacy_refusal",
                "reply": (
                    "I can't access or share other users' data, passwords, or system credentials. "
                    "I only work with your own private account."
                ),
                "memories": [],
                "model": "privacy-guard",
                "prompt_version": self.config.prompt_version,
                "latency_ms": round((time.perf_counter() - started) * 1000, 1),
                "privacy_scan": scan.to_summary(),
            }

        safe_user_message = scan.redacted_text.strip()
        if not safe_user_message:
            return {
                "status": "empty",
                "intent": "clarification_needed",
                "reply": "I didn't catch a message—could you say or type that again?",
                "memories": [],
                "prompt_version": self.config.prompt_version,
            }

        if not self.is_configured():
            return {
                "status": "error",
                "message": "No LLM provider API key is configured on the backend.",
                "memories": [],
            }

        # 2. Build Versioned System Prompt with User Preferences & Approved Memories
        system_content = SYSTEM_PROMPT_V3
        system_content += f"\n\nINTERACTION MODE: {mode.upper()} | LENGTH PREFERENCE: {response_length_preference}"
        if voice_style_note:
            system_content += f"\nUSER STYLE NOTE: {voice_style_note}"

        if approved_memories:
            memory_lines = [
                f"- [{normalize_memory_category(m.get('category'))}] {m.get('title', '')}: {m.get('content', '')}"
                for m in approved_memories
            ]
            system_content += "\n\nAPPROVED USER MEMORIES:\n" + "\n".join(memory_lines)

        recent_assistant_openers = [
            (turn.get("content") or "")[:40]
            for turn in (conversation_history or [])[-6:]
            if turn.get("role") == "assistant" and turn.get("content")
        ]
        if recent_assistant_openers:
            system_content += (
                "\n\nAVOID REPEATING THESE RECENT PHRASES:\n- "
                + "\n- ".join(recent_assistant_openers)
            )

        messages_payload: List[Dict[str, str]] = [
            {"role": "system", "content": system_content}
        ]
        for turn in (conversation_history or [])[-8:]:
            role = turn.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = privacy_service.redact_for_logging((turn.get("content") or "").strip())
            if content:
                messages_payload.append({"role": role, "content": content})

        if not messages_payload or messages_payload[-1].get("content") != safe_user_message:
            messages_payload.append({"role": "user", "content": safe_user_message})

        # 3. Call LLM Provider with Failover
        try:
            result_data: Optional[Dict[str, Any]] = None
            last_err: Optional[Exception] = None
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
                    if ollama_exc.status_code in (401, 402, 403, 404, 429):
                        self._ollama_cooldown_until = now + 300.0
                except Exception as ollama_other_exc:
                    last_err = ollama_other_exc
                    self._ollama_cooldown_until = now + 60.0

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
                    await asyncio.sleep(0.4 * (attempt + 1))

            if result_data is None:
                if last_err is not None:
                    raise last_err
                raise RuntimeError("No LLM response received.")

            raw_content = result_data.get("content", "{}").strip()
            used_model = result_data.get("model", self.groq_model)

            if "</think>" in raw_content:
                raw_content = raw_content.split("</think>")[-1].strip()
            if raw_content.startswith("```"):
                lines = raw_content.splitlines()
                if len(lines) >= 3:
                    raw_content = "\n".join(lines[1:-1]).strip()

            parsed_reply = raw_content
            detected_intent = "qa"
            extracted_memories: List[Dict[str, Any]] = []

            try:
                parsed_json = json.loads(raw_content)
                if isinstance(parsed_json, dict):
                    detected_intent = str(parsed_json.get("intent") or "qa")
                    parsed_reply = str(parsed_json.get("reply") or "").strip()
                    raw_mems = parsed_json.get("memories")
                    if isinstance(raw_mems, list) and not scan.has_hard_secret:
                        for item in raw_mems:
                            if not (
                                isinstance(item, dict)
                                and item.get("title")
                                and item.get("content")
                            ):
                                continue
                            clean_t, clean_c, allowed = privacy_service.sanitize_memory_candidate(
                                str(item["title"]), str(item["content"])
                            )
                            if not allowed:
                                continue
                            extracted_memories.append(
                                {
                                    "category": normalize_memory_category(item.get("category")),
                                    "title": clean_t.strip()[:80],
                                    "content": clean_c.strip()[:300],
                                    "explicit_save": bool(item.get("explicit_save", False)),
                                }
                            )
            except Exception:
                parsed_reply = raw_content

            if not parsed_reply:
                parsed_reply = "I'm right here with you! Tell me more."

            # 4. Sanitize outgoing reply
            safe_reply = privacy_service.sanitize_response(parsed_reply)
            if scan.has_hard_secret and "secret" not in safe_reply.lower():
                safe_reply += " (For your security, I did not save your password or API key.)"

            return {
                "status": "ok",
                "intent": detected_intent,
                "reply": safe_reply,
                "memories": extracted_memories,
                "model": used_model,
                "prompt_version": self.config.prompt_version,
                "latency_ms": round((time.perf_counter() - started) * 1000, 1),
                "privacy_scan": scan.to_summary(),
            }
        except Exception as exc:
            return {
                "status": "error",
                "message": f"LLM error: {exc}",
                "memories": [],
                "prompt_version": self.config.prompt_version,
                "latency_ms": round((time.perf_counter() - started) * 1000, 1),
            }


llm_service = LLMService()
