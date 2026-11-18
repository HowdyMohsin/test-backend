"""Payment provider adapter. No provider is connected yet, so checkout is unavailable and the site
collects a waitlist instead. When a provider is chosen, only this file changes."""
from __future__ import annotations


def enabled() -> bool:
    return False


async def create_checkout(email: str | None, plan: str, success_url: str) -> str | None:
    return None
