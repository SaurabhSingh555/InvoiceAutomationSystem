"""Robust JSON serialization for Supabase / PostgreSQL values.

Converts UUID, Decimal, date, datetime, enum, lists, dicts, and None into
JSON-serializable Python values.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Iterable
from uuid import UUID


def serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (str, int, float)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [serialize_value(v) for v in value]
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except Exception:
            return value.hex()
    # Enum -> use its value
    value_attr = getattr(value, "value", None)
    if value_attr is not None and not callable(value_attr):
        return serialize_value(value_attr)
    return str(value)


def serialize_row(row: dict | None) -> dict | None:
    if row is None:
        return None
    return {k: serialize_value(v) for k, v in row.items()}


def serialize_rows(rows: Iterable[dict] | None) -> list[dict]:
    if not rows:
        return []
    return [serialize_row(r) for r in rows if r is not None]
