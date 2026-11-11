"""Memory management routes (Prepared for Phase 7 consent-based Supabase storage)."""

from typing import Dict, Literal
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..services.memory_service import memory_service

router = APIRouter(prefix="/api/v1/memory", tags=["Consent-Based Memory"])


class MemoryCreateRequest(BaseModel):
    category: Literal["Profile", "Preferences", "Work", "Interests"]
    title: str = Field(..., min_length=1, max_length=120)
    content: str = Field(..., min_length=1, max_length=1000)
    explicit_user_consent: bool = Field(
        ...,
        description="Must be True. Personal memories are never stored without explicit user approval.",
    )


@router.get("/status")
async def get_memory_service_status() -> Dict:
    """Inspect Phase 7 memory service configuration and consent policy."""
    return memory_service.get_status()


@router.post("/validate")
async def validate_memory_entry(payload: MemoryCreateRequest) -> Dict:
    """
    Validates explicit user consent and category rules before Phase 7 database persistence.
    """
    try:
        return await memory_service.validate_and_prepare_memory(
            category=payload.category,
            title=payload.title,
            content=payload.content,
            explicit_user_consent=payload.explicit_user_consent,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
