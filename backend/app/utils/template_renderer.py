"""Render {{variable}} placeholders in email templates."""
from __future__ import annotations

import re
from typing import Any, Mapping

_VAR_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def render_template(text: str | None, variables: Mapping[str, Any] | None) -> str:
    if not text:
        return text or ""
    if not variables:
        return _VAR_PATTERN.sub("", text)

    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        if key in variables and variables[key] is not None:
            return str(variables[key])
        return match.group(0)

    return _VAR_PATTERN.sub(repl, text)
