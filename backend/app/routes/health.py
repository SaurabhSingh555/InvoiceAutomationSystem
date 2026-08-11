"""System health check route.

GET /api/health
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from ..database import check_database_connection, check_storage_connection

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health():
    db_ok, db_err = check_database_connection()
    st_ok, st_err = check_storage_connection()
    success = db_ok and st_ok
    return {
        "success": success,
        "database": "connected" if db_ok else "error",
        "storage": "connected" if st_ok else "error",
        "database_error": db_err,
        "storage_error": st_err,
    }
