"""Memory management routes (JWT-authenticated, consent-based, privacy-guarded)."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..services.authentication_service import AuthenticatedUser, get_current_user
from ..services.memory_service import memory_service

router = APIRouter(prefix="/api/v1/memory", tags=["Consent-Based Memory"])


class MemoryCreateRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=64)
    title: str = Field(..., min_length=1, max_length=120)
    content: str = Field(..., min_length=1, max_length=1000)
    explicit_user_consent: bool = Field(...)
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365)


@router.get("/status")
async def get_memory_service_status() -> Dict[str, Any]:
    return memory_service.get_status()


@router.get("/")
async def list_memories(
    include_pending: bool = True,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    items = memory_service.list_user_memories(
        user_id=current_user.user_id, include_pending=include_pending
    )
    return {"status": "ok", "user_id": current_user.user_id, "memories": items}


@router.post("/save")
async def save_memory(
    payload: MemoryCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        record = await memory_service.save_memory_with_consent(
            user_id=current_user.user_id,
            category=payload.category,
            title=payload.title,
            content=payload.content,
            explicit_user_consent=payload.explicit_user_consent,
            expires_in_days=payload.expires_in_days,
        )
        return {"status": "ok", "memory": record}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post("/{memory_id}/approve")
async def approve_memory(
    memory_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        rec = await memory_service.approve_memory(current_user.user_id, memory_id)
        return {"status": "ok", "memory": rec}
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post("/{memory_id}/reject")
async def reject_memory(
    memory_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        rec = await memory_service.reject_memory(current_user.user_id, memory_id)
        return {"status": "ok", "memory": rec}
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    deleted = await memory_service.delete_memory(current_user.user_id, memory_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found for this user.",
        )
    return {"status": "ok", "deleted": True, "id": memory_id}


@router.post("/validate")
async def validate_memory_entry(payload: MemoryCreateRequest) -> Dict[str, Any]:
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
