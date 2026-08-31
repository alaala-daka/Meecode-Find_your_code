"""行 → 前端卡片 DTO。feed 与 /me/*、/users/* 共用,故单独成文件。

like_count 用相关子查询实时算:MVP 量级足够,且永远准确,不引计数列。
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from .schemas import RepoCardOut


def _card_select(from_clause: str) -> str:
    return (
        "SELECT r.*, (SELECT COUNT(*) FROM interactions i"
        " WHERE i.repo_id = r.id AND i.kind = 'like') AS like_count " + from_clause
    )


def _iso(ts: int) -> str:
    return datetime.fromtimestamp(ts or 0, timezone.utc).isoformat()


def to_card(row: sqlite3.Row) -> RepoCardOut:
    full_name = row["full_name"]
    return RepoCardOut(
        id=row["id"], full_name=full_name,
        title=full_name.partition("/")[2] or full_name,
        owner_login=row["owner_login"],
        language=row["language"] or None,
        topics=[t for t in (row["topics"] or "").split(",") if t],
        stars=row["stars"], views=row["repo_view_count"], likes=row["like_count"],
        source=row["source"], category=row["category"], tagline_zh=row["tagline_zh"],
        published_at=_iso(row["published_at"]),
        cover_url=row["cover_url"] or None,
    )
