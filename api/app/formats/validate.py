"""Checks user settings against a pair's schema. Unknown or out-of-range values are rejected, never guessed."""
from __future__ import annotations

import re
from typing import Any, Iterable

from .base import SettingField


class SettingsError(ValueError):
    pass


def defaults(fields: Iterable[SettingField]) -> dict[str, Any]:
    return {f.key: f.default for f in fields}


def validate(fields: Iterable[SettingField], raw: dict[str, Any] | None) -> dict[str, Any]:
    fields = list(fields)
    by_key = {f.key: f for f in fields}
    raw = raw or {}
    out = defaults(fields)
    for key, value in raw.items():
        f = by_key.get(key)
        if f is None:
            raise SettingsError(f"Unknown option: {key}")
        out[key] = _coerce(f, value)
    return out


def _coerce(f: SettingField, v: Any) -> Any:
    if f.type == "boolean":
        if isinstance(v, bool):
            return v
        if str(v).lower() in ("true", "1", "yes", "on"):
            return True
        if str(v).lower() in ("false", "0", "no", "off"):
            return False
        raise SettingsError(f"{f.label}: must be on or off")
    if f.type in ("number", "range"):
        if v is None or v == "":
            return f.default
        try:
            n = float(v)
        except (TypeError, ValueError):
            raise SettingsError(f"{f.label}: must be a number") from None
        if (f.min is not None and n < f.min) or (f.max is not None and n > f.max):
            raise SettingsError(f"{f.label}: must be between {f.min:g} and {f.max:g}")
        return int(n) if n.is_integer() and float(f.step or 1).is_integer() else n
    if f.type == "select":
        s = str(v)
        if s not in {o.value for o in f.options}:
            raise SettingsError(f"{f.label}: '{s}' is not an allowed choice")
        return s
    if f.type == "color":
        s = str(v)
        if s != "transparent" and not re.fullmatch(r"#[0-9a-fA-F]{6}", s):
            raise SettingsError(f"{f.label}: use transparent or a color like #ffffff")
        return s
    return str(v)[:64]
