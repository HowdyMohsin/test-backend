"""Async engine and session factory."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.settings import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=20)
SessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def session_scope() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session
