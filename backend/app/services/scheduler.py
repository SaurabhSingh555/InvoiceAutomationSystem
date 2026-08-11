"""APScheduler-based background job runner for payment reminders.

The interval is read from the `app_settings` table in Supabase (falling
back to 60 minutes). To enable/disable reminders, flip the `enabled`
column in the `app_settings` table.
"""
from __future__ import annotations

import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler

from ..database import get_supabase
from .payment_reminder_service import process_payment_reminders

logger = logging.getLogger("invoice_app")

_scheduler: BackgroundScheduler | None = None
DEFAULT_INTERVAL_MINUTES = 60


def _read_interval_minutes() -> int:
    """Read the reminder interval from `app_settings.reminder_interval_minutes`."""
    try:
        sb = get_supabase()
        res = (
            sb.table("app_settings")
            .select("reminder_interval_minutes, reminder_enabled")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            row = res.data[0]
            if row.get("reminder_enabled") is False:
                return 0  # disabled
            try:
                return max(1, int(row.get("reminder_interval_minutes") or DEFAULT_INTERVAL_MINUTES))
            except Exception:
                return DEFAULT_INTERVAL_MINUTES
    except Exception as e:
        logger.exception("Failed to read app_settings: %s", e)

    # Fallback to env var
    try:
        return max(1, int(os.environ.get("PAYMENT_REMINDER_CHECK_INTERVAL_MINUTES", DEFAULT_INTERVAL_MINUTES)))
    except Exception:
        return DEFAULT_INTERVAL_MINUTES


def _run_reminder_job() -> None:
    try:
        summary = process_payment_reminders()
        logger.info(
            "Payment reminder job done: checked=%s sent=%s failed=%s skipped=%s",
            summary.get("checked"),
            summary.get("sent"),
            summary.get("failed"),
            summary.get("skipped"),
        )
    except Exception as e:
        logger.exception("Payment reminder job failed: %s", e)


def start_scheduler() -> None:
    global _scheduler
    if _scheduler:
        return
    minutes = _read_interval_minutes()
    if minutes <= 0:
        logger.info("Payment reminder scheduler is disabled (reminder_enabled=false).")
        return
    _scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    _scheduler.add_job(
        _run_reminder_job,
        trigger="interval",
        minutes=minutes,
        id="payment_reminder_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Payment reminder scheduler started (every %s minutes)", minutes)


def stop_scheduler() -> None:
    global _scheduler
    if not _scheduler:
        return
    try:
        _scheduler.shutdown(wait=False)
    except Exception as e:
        logger.exception("Scheduler shutdown error: %s", e)
    _scheduler = None
