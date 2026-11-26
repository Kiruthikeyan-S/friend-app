"""
Authentication Service
Validates Supabase JWT access tokens in FastAPI, enforces per-user isolation,
and ensures service-role credentials stay strictly on the backend.
"""

import base64
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx
from fastapi import Header, HTTPException, status


@dataclass
class AuthenticatedUser:
    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"
    is_verified: bool = True


def _decode_jwt_payload_unverified(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        data = json.loads(raw.decode("utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


class AuthenticationService:
    """Validates Supabase Bearer JWT tokens and enforces user ownership."""

    def __init__(self) -> None:
        self._verified_cache: Dict[str, tuple[AuthenticatedUser, float]] = {}

    @property
    def supabase_url(self) -> str:
        return (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")

    @property
    def supabase_anon_or_service_key(self) -> str:
        return (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or ""
        ).strip()

    async def verify_bearer_token(self, authorization: Optional[str]) -> AuthenticatedUser:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization Bearer token.",
            )

        token = authorization.split(" ", 1)[1].strip()
        if not token or len(token.split(".")) != 3:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed JWT token.",
            )

        payload = _decode_jwt_payload_unverified(token)
        if not payload or not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid JWT claims.",
            )

        exp = payload.get("exp")
        if isinstance(exp, (int, float)) and time.time() > float(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please sign in again.",
            )

        cached = self._verified_cache.get(token)
        if cached and time.time() < cached[1]:
            return cached[0]

        # Validate live against Supabase Auth (/auth/v1/user) when configured
        if self.supabase_url and self.supabase_anon_or_service_key:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.get(
                        f"{self.supabase_url}/auth/v1/user",
                        headers={
                            "apikey": self.supabase_anon_or_service_key,
                            "Authorization": f"Bearer {token}",
                        },
                    )
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or revoked Supabase session token.",
                    )
                user_json = resp.json()
                user = AuthenticatedUser(
                    user_id=str(user_json.get("id") or payload["sub"]),
                    email=user_json.get("email"),
                    role=str(user_json.get("role") or "authenticated"),
                    is_verified=True,
                )
                self._verified_cache[token] = (user, time.time() + 120.0)
                return user
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Authentication verification failed: {exc}",
                ) from exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase authentication is not configured on backend.",
        )

    def assert_user_ownership(
        self, authenticated_user_id: str, requested_user_id: Optional[str]
    ) -> None:
        if requested_user_id and requested_user_id != authenticated_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: cannot access another user's records.",
            )

    def get_status(self) -> Dict[str, Any]:
        return {
            "service": "authentication",
            "provider": "Supabase JWT Auth",
            "configured": bool(self.supabase_url and self.supabase_anon_or_service_key),
            "service_role_configured": bool((os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()),
        }


authentication_service = AuthenticationService()


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    """FastAPI dependency that enforces valid Supabase JWT authentication."""
    return await authentication_service.verify_bearer_token(authorization)
