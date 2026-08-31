"""卡片流与搜索。

曝光计数在此：谁进了返回列表就 +1（见 spec「指标定义」）。服务端计数，
零前端埋点；偏乐观但对投稿/采集两侧同样宽松，不影响中位数比较。
"""
from __future__ import annotations

import re
import sqlite3
import time

from fastapi import APIRouter, Depends, HTTPException, Query

from ... import config
from .. import ranking
from ..cards import to_card
from ..deps import get_conn
from ..schemas import FeedOut

router = APIRouter()


def bump_impressions(conn: sqlite3.Connection, repo_ids: list[int]) -> None:
    """原子自增，不插行 —— feed 每次返回都要写，不能有行插入开销。"""
    if not repo_ids:
        return
    conn.executemany(
        "UPDATE repos SET impression_count = impression_count + 1 WHERE id = ?",
        [(i,) for i in repo_ids],
    )
    conn.commit()


@router.get("/feed", response_model=FeedOut)
def get_feed(
    category: str | None = None,
    page: int = Query(1, ge=1),
    conn: sqlite3.Connection = Depends(get_conn),
) -> FeedOut:
    if category and category not in config.CATEGORIES:
        raise HTTPException(status_code=422, detail=f"未知分类：{category}")

    now = int(time.time())
    # pending_claim（未认领的采集仓库）也要展示 —— 只有 delisted 不可见
    sql = "SELECT * FROM repos WHERE status != 'delisted'"
    params: list = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    sql += " ORDER BY published_at DESC LIMIT ?"
    params.append(config.FEED_CANDIDATE_LIMIT)

    rows = conn.execute(sql, params).fetchall()
    ranked = sorted(rows, key=lambda r: ranking.score(r, now), reverse=True)

    # 预留位只给窗口内的投稿；其余（含过窗投稿与全部采集）走普通位
    window = config.DEBUT_WINDOW_HOURS * 3600
    debut_ids = {
        r["id"] for r in ranked
        if r["source"] == "submitted" and now - r["published_at"] <= window
    }
    submitted = [r for r in ranked if r["id"] in debut_ids]
    others = [r for r in ranked if r["id"] not in debut_ids]

    size = config.FEED_PAGE_SIZE
    ordered = ranking.interleave(submitted, others, size)  # 全量成序，切片即翻页

    start = (page - 1) * size
    slice_ = ordered[start:start + size]
    bump_impressions(conn, [r["id"] for r in slice_])
    return FeedOut(
        items=[to_card(r) for r in slice_],
        page=page,
        has_more=len(ordered) > start + size,
    )


def _fts_escape(q: str) -> str:
    """FTS5 有自己的查询语法：AND/OR/NEAR/引号/星号都会被解析。
    这里只做字面量匹配，故整串加引号并转义内部引号。"""
    cleaned = re.sub(r'["]', '""', q.strip())
    return f'"{cleaned}"' if cleaned else ""


@router.get("/search", response_model=FeedOut)
def search(
    q: str,
    page: int = Query(1, ge=1),
    conn: sqlite3.Connection = Depends(get_conn),
) -> FeedOut:
    needle = _fts_escape(q)
    if not needle:
        return FeedOut(items=[], page=page, has_more=False)

    size = config.FEED_PAGE_SIZE
    try:
        rows = conn.execute(
            "SELECT r.* FROM repos_fts f JOIN repos r ON r.id = f.rowid"
            " WHERE repos_fts MATCH ? AND r.status != 'delisted'"
            " ORDER BY rank LIMIT ? OFFSET ?",
            (needle, size + 1, (page - 1) * size),
        ).fetchall()
    except sqlite3.OperationalError:
        return FeedOut(items=[], page=page, has_more=False)  # 语法异常一律空结果

    has_more = len(rows) > size
    rows = rows[:size]
    bump_impressions(conn, [r["id"] for r in rows])
    return FeedOut(items=[to_card(r) for r in rows], page=page, has_more=has_more)
