"""Retention & Evaluation routes."""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from ..services.authentication_service import AuthenticatedUser, get_current_user
from ..services.evaluation_service import evaluation_service
from ..services.retention_service import retention_service

retention_router = APIRouter(prefix="/api/v1/retention", tags=["Data Retention"])
evaluation_router = APIRouter(prefix="/api/v1/evaluation", tags=["LLM Evaluation"])


@retention_router.get("/status")
async def get_retention_status() -> Dict[str, Any]:
    return retention_service.get_status()


@retention_router.post("/run")
async def trigger_retention_cleanup(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    _ = current_user
    return await retention_service.run_cleanup()


@retention_router.get("/logs")
async def get_retention_logs(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    _ = current_user
    return {"status": "ok", "logs": retention_service.get_logs()}


@evaluation_router.get("/dataset")
async def get_evaluation_dataset() -> Dict[str, Any]:
    return {"status": "ok", "cases": evaluation_service.get_dataset()}


@evaluation_router.post("/run")
async def run_evaluation(live: bool = False) -> Dict[str, Any]:
    return await evaluation_service.run_regression_suite(run_live_llm=live)
