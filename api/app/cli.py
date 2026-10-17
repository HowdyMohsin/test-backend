"""CLI: python -m app.cli <seed|selfcheck|create-admin|cleanup|formats-json>

- seed: load plans.json + messages.json into the DB
- selfcheck [--pair slug]: verify pairs (all 210 by default)
- create-admin --email E --password P: create the first admin (owner)
- cleanup: run the expired-file cleanup once
- formats-json [--out PATH]: dump the registry snapshot for the frontend
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import sys
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent.parent / "seed"


async def cmd_seed() -> None:
    from sqlalchemy import select

    from app.db.models import AppSetting, Message, Plan
    from app.db.session import SessionFactory

    plans = json.loads((SEED_DIR / "plans.json").read_text())
    messages = json.loads((SEED_DIR / "messages.json").read_text())
    async with SessionFactory() as s:
        async with s.begin():
            for p in plans:
                row = await s.get(Plan, p["id"])
                if row is None:
                    s.add(Plan(id=p["id"], name=p["name"], price_cents=p.get("price_cents", 0),
                               limits=p.get("limits", {})))
                else:
                    row.name = p["name"]
                    row.price_cents = p.get("price_cents", 0)
                    row.limits = p.get("limits", {})
            existing = {m.key for m in (await s.execute(select(Message))).scalars().all()}
            for key, text in messages.items():
                if key not in existing:
                    s.add(Message(key=key, text=text))
    print(f"seeded {len(plans)} plans, {len(messages)} messages")
    await _seed_app_settings(s)


async def _seed_app_settings(session) -> None:
    """Seed JSON app settings (site, presets, popular) only when missing,
    so admin edits in the Settings tab are never overwritten."""
    from app.db.models import AppSetting

    seeds = {
        "site": json.loads((SEED_DIR / "site.json").read_text()),
        "presets": {"items": json.loads((SEED_DIR / "presets.json").read_text())},
        "popular_pinned": json.loads((SEED_DIR / "popular.json").read_text()),
    }
    added = 0
    async with session.begin():
        for key, value in seeds.items():
            if await session.get(AppSetting, key) is None:
                session.add(AppSetting(key=key, value=value))
                added += 1
    if added:
        print(f"seeded {added} app settings")


async def cmd_selfcheck(pair: str | None) -> None:
    from app.core.selfcheck import run_selfcheck

    result = await run_selfcheck(pair)
    print(f"total={result['total']} passed={result['passed']} "
          f"failed={result['failed']} testing={result['testing']}")
    for slug, res in result["results"].items():
        if res["status"] != "live":
            print(f"  [{res['status']}] {slug}: {res['detail'][:120]}")
    if result["failed"]:
        sys.exit(1)


async def cmd_create_admin(email: str, password: str | None) -> None:
    from sqlalchemy import select

    from app.api.admin.auth import hash_password
    from app.db.models import AdminUser
    from app.db.session import SessionFactory

    if not password:
        password = getpass.getpass("admin password: ")
    email = email.lower().strip()
    async with SessionFactory() as s:
        async with s.begin():
            exists = (
                await s.execute(select(AdminUser).where(AdminUser.email == email))
            ).scalar_one_or_none()
            if exists:
                print("admin already exists")
                return
            s.add(AdminUser(email=email, password_hash=hash_password(password), role="owner"))
    print(f"owner admin created: {email}")


async def cmd_cleanup() -> None:
    from app.core.worker import run_cleanup_once

    print(await run_cleanup_once())


def cmd_formats_json(out: str) -> None:
    from app.formats import registry

    snap = registry.snapshot()
    Path(out).write_text(json.dumps(snap, indent=2, default=str))
    print(f"wrote {out} ({snap['pair_count']} pairs)")


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed")
    sc = sub.add_parser("selfcheck")
    sc.add_argument("--pair", default=None)
    ca = sub.add_parser("create-admin")
    ca.add_argument("--email", required=True)
    ca.add_argument("--password", default=None)
    sub.add_parser("cleanup")
    fj = sub.add_parser("formats-json")
    fj.add_argument("--out", default="formats.json")
    args = ap.parse_args()

    if args.cmd == "seed":
        asyncio.run(cmd_seed())
    elif args.cmd == "selfcheck":
        asyncio.run(cmd_selfcheck(args.pair))
    elif args.cmd == "create-admin":
        asyncio.run(cmd_create_admin(args.email, args.password))
    elif args.cmd == "cleanup":
        asyncio.run(cmd_cleanup())
    elif args.cmd == "formats-json":
        cmd_formats_json(args.out)


if __name__ == "__main__":
    main()
