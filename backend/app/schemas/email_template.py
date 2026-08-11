"""Pydantic models for email templates."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class EmailTemplateCreate(BaseModel):
    template_name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    status: str = "Active"


class EmailTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class RenderRequest(BaseModel):
    template_name: str = Field(..., min_length=1)
    variables: dict = {}
