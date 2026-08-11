"""GET /api/dashboard — robust aggregations over real Supabase data."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from ..database import get_supabase
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _safe_query(sb, **filters) -> list[dict]:
    try:
        q = sb.table("invoices").select("*")
        for col, val in filters.items():
            if val is None:
                continue
            q = q.eq(col, val)
        res = q.execute()
        return list(res.data or [])
    except Exception as e:
        logger.exception("query failed filters=%s: %s", filters, e)
        return []


def _count(sb, **filters) -> int:
    return len(_safe_query(sb, **filters))


def _count_reminders_sent(sb) -> int:
    try:
        res = sb.table("invoices").select("payment_reminder_sent_at").execute()
        return sum(1 for r in (res.data or []) if r.get("payment_reminder_sent_at"))
    except Exception as e:
        logger.exception("count_reminders_sent failed: %s", e)
        return 0


def _sum_invoice_amount(sb) -> float:
    try:
        res = sb.table("invoices").select("invoice_amount").execute()
        total = 0.0
        for r in res.data or []:
            try:
                total += float(r.get("invoice_amount") or 0)
            except Exception:
                pass
        return round(total, 2)
    except Exception as e:
        logger.exception("sum_invoice_amount failed: %s", e)
        return 0.0


@router.get("")
def get_dashboard(request: Request):
    try:
        sb = get_supabase()
    except Exception as e:
        logger.exception("get_supabase failed in dashboard")
        return {"success": False, "message": humanize_supabase_error(e)}

    try:
        total = _count(sb)
        pending_approval = _count(sb, status="Pending Approval")
        approved = _count(sb, status="Approved")
        rejected = _count(sb, status="Rejected")
        sent_to_client = _count(sb, status="Sent to Client")
        pending_payment = _count(
            sb, status="Sent to Client", payment_status="Pending"
        )
        payment_received = _count(sb, payment_status="Received")
        payment_reminders_sent = _count_reminders_sent(sb)
        total_invoice_amount = _sum_invoice_amount(sb)

        return {
            "success": True,
            "data": {
                "total_invoices": total,
                "pending_approval": pending_approval,
                "approved": approved,
                "rejected": rejected,
                "sent_to_client": sent_to_client,
                "pending_payment": pending_payment,
                "payment_received": payment_received,
                "payment_reminders_sent": payment_reminders_sent,
                "total_invoice_amount": total_invoice_amount,
            },
        }
    except Exception as e:
        logger.exception("Dashboard aggregation failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
