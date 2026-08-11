"""Supabase Storage helpers — uses the centralized Supabase client."""
from __future__ import annotations

import logging
import uuid

from ..database import get_storage, get_bucket_name

logger = logging.getLogger("invoice_app")

ALLOWED_EXT = {".pdf", ".xls", ".xlsx"}
ALLOWED_MIME = {
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}


def _guess_mime(name: str) -> str:
    n = name.lower()
    if n.endswith(".pdf"):
        return "application/pdf"
    if n.endswith(".xlsx"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if n.endswith(".xls"):
        return "application/vnd.ms-excel"
    return "application/octet-stream"


def validate_file(filename: str, content_type: str | None, size: int) -> None:
    if not filename:
        raise ValueError("Missing filename")
    if size <= 0:
        raise ValueError("Empty file")
    if size > 20 * 1024 * 1024:
        raise ValueError("File too large. Maximum allowed size is 20 MB")
    ext = ("." + filename.rsplit(".", 1)[-1]).lower() if "." in filename else ""
    if ext not in ALLOWED_EXT:
        raise ValueError("Invalid file type. Only PDF, XLS, and XLSX are allowed")


def upload_invoice_file(file_bytes: bytes, original_name: str) -> dict:
    storage = get_storage()
    bucket = get_bucket_name()
    safe_name = original_name.replace("/", "_").replace("\\", "_").replace(" ", "_")
    storage_path = f"invoices/{uuid.uuid4().hex}_{safe_name}"
    mime = _guess_mime(safe_name)
    try:
        storage.from_(bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": mime},
        )
    except Exception as e:
        logger.exception("Supabase storage upload failed")
        raise RuntimeError(f"Failed to upload file: {e}")
    return {
        "storage_path": storage_path,
        "file_name": safe_name,
        "file_size": len(file_bytes),
        "mime_type": mime,
    }


def download_invoice(storage_path: str) -> bytes:
    storage = get_storage()
    bucket = get_bucket_name()
    try:
        return storage.from_(bucket).download(storage_path)
    except Exception as e:
        logger.exception("Supabase storage download failed")
        raise RuntimeError(f"Failed to download file: {e}")
