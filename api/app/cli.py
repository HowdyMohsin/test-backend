"""python -m app.cli <command>: seed | selfcheck | create-admin | cleanup | verify-registry"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import json
from pathlib import Path

from sqlalchemy import select

from .core.auth import normalize_email, password_hash, validate_password
from .core.errors import ApiError
from .db.models import AdminUser, AdSlot, FormatState, Message, Plan, Preset, SiteSetting
from .db.session import SessionLocal
from .formats import registry

SEED = Path(__file__).resolve().parents[1] / "seed"


async def _default_admin(db) -> None:
    """Dev convenience: one admin so the panel opens right away. Never created outside ENV=dev."""
    from .settings import get_settings

    s = get_settings()
    if not (s.default_admin_email and s.default_admin_password):
        return
    if s.env != "dev":
        print("DEFAULT_ADMIN_* is ignored because ENV is not dev. Use create-admin instead.")
        return
    if not (await db.execute(select(AdminUser))).first():
        try:
            email = normalize_email(s.default_admin_email)
            validate_password(s.default_admin_password)
        except ApiError as error:
            raise RuntimeError(f"DEFAULT_ADMIN_* is not safe: {error.message}") from None
        db.add(AdminUser(email=email, password_hash=password_hash(s.default_admin_password), role="super_admin", tabs=[]))
        print(f"Default admin created: {email}")


async def seed() -> None:
    async with SessionLocal() as db:
        plans = {p.id for p in (await db.execute(select(Plan))).scalars()}
        by_id = {p.id: p for p in (await db.execute(select(Plan))).scalars()}
        for p in json.loads((SEED / "plans.json").read_text()):
            if p["id"] not in plans:
                db.add(Plan(**p))
            else:
                by_id[p["id"]].sort = p["sort"]  # order is structure; limits and prices stay as the admin set them
        msgs = {m.key for m in (await db.execute(select(Message))).scalars()}
        for k, v in json.loads((SEED / "messages.json").read_text()).items():
            if k not in msgs:
                db.add(Message(key=k, locale="en", text=v))
        pre = {(p.category, p.key) for p in (await db.execute(select(Preset))).scalars()}
        for p in json.loads((SEED / "presets.json").read_text()):
            if (p["category"], p["key"]) not in pre:
                db.add(Preset(**p))
        slots = {s.key for s in (await db.execute(select(AdSlot))).scalars()}
        for s in json.loads((SEED / "ad_slots.json").read_text()):
            if s["key"] not in slots:
                db.add(AdSlot(**s))
        sets = {s.key for s in (await db.execute(select(SiteSetting))).scalars()}
        for k, v in {"maintenance_enabled": False, "maintenance_message": "", "announcement_text": "", "announcement_link": "",
                     "announcement_expires": None, "public_stats_enabled": False, "retention_minutes": None}.items():
            if k not in sets:
                db.add(SiteSetting(key=k, value=v))
        fs = {s.key for s in (await db.execute(select(FormatState))).scalars()}
        for slug in registry.formats():
            if slug not in fs:
                db.add(FormatState(key=slug, kind="format", status="live"))
        for slug in registry.pairs():
            if slug not in fs:
                db.add(FormatState(key=slug, kind="pair", status="testing"))
        await _default_admin(db)
        await db.commit()
    print(f"Seeded. {len(registry.formats())} formats, {len(registry.pairs())} pairs (new pairs start in 'testing').")


async def selfcheck(pairs: list[str] | None, concurrency: int) -> None:
    from .core import selfcheck as sc
    async with SessionLocal() as db:
        r = await sc.run(db, pairs, concurrency)
    print(f"\nTotal {r['total']}  passed {r['passed']}  failed {r['failed']}  skipped {r['skipped']}")


async def create_admin(email: str, password: str) -> None:
    try:
        email = normalize_email(email)
        validate_password(password)
    except ApiError as error:
        raise RuntimeError(f"Admin account was not created: {error.message}") from None
    async with SessionLocal() as db:
        if (await db.execute(select(AdminUser).where(AdminUser.email == email))).scalar_one_or_none():
            print("That admin already exists.")
            return
        db.add(AdminUser(email=email, password_hash=password_hash(password), role="super_admin", tabs=[]))
        await db.commit()
    print(f"Super admin {email} created.")


async def cleanup() -> None:
    from .core.worker import janitor_once
    await janitor_once()
    print("Expired files and old events cleaned.")


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed")
    sc = sub.add_parser("selfcheck")
    sc.add_argument("--pair", action="append", help="e.g. jpg-to-png (repeatable)")
    sc.add_argument("--concurrency", type=int, default=2)
    ca = sub.add_parser("create-admin")
    ca.add_argument("--email", required=True)
    ca.add_argument("--password", help="omit to be asked")
    sub.add_parser("cleanup")
    sub.add_parser("verify-registry")
    sub.add_parser("verify-engines")
    a = ap.parse_args()
    if a.cmd == "verify-engines":
        from .core.engine_check import run
        rows = run()
        for name, ok, note in rows:
            print(f"{'PASS' if ok else 'FAIL'}  {name}  {note}")
        raise SystemExit(0 if all(ok or "HEIC encode" in n for n, ok, _ in rows) else 1)
    if a.cmd == "verify-registry":
        f, p = registry.formats(), registry.pairs()
        print(f"{len(f)} formats, {len(p)} pairs")
        raise SystemExit(0 if (len(f), len(p)) == (32, 210) else 1)
    if a.cmd == "seed":
        asyncio.run(seed())
    elif a.cmd == "selfcheck":
        asyncio.run(selfcheck(a.pair, a.concurrency))
    elif a.cmd == "create-admin":
        asyncio.run(create_admin(a.email, a.password or getpass.getpass("Password: ")))
    elif a.cmd == "cleanup":
        asyncio.run(cleanup())


if __name__ == "__main__":
    main()
