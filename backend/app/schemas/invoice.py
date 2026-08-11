"""Pydantic models for invoice workflow requests."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ApproveRequest(BaseModel):
    approved_by: str = Field(..., min_length=1)


class RejectRequest(BaseModel):
    rejected_by: str = Field(..., min_length=1)
    rejection_reason: str = Field(..., min_length=1)


class ShareRequest(BaseModel):
    sent_by: str = Field(..., min_length=1)
    cc: str = ""
    bcc: str = ""
    subject: str = ""
    body: str = ""


class PaymentReceivedRequest(BaseModel):
    received_by: str = "Ops"
