"""行 → 卡片 DTO。feed 与 /me/* 共用，故单独成文件，避免跨路由导私有函数。"""
from __future__ import annotations

import sqlite3

from .schemas import RepoCard


def to_card(row: sqlite3.Row) -> RepoCard:
    return RepoCard(
        id=row["id"], full_name=row["full_name"], owner_login=row["owner_login"],
        language=row["language"], stars=row["stars"], tagline_zh=row["tagline_zh"],
        category=row["category"], cover_url=row["cover_url"], source=row["source"],
        published_at=row["published_at"],
        topics=[t for t in (row["topics"] or "").split(",") if t],
    )
