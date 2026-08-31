"""保底曝光达标率日报（spec 第 4 节验收）。

达标线：窗口内投稿的 impression_count ≥ 同窗口采集仓库的 impression_count 中位数。
只比同一 72 小时窗口 —— impression_count 是累计值，跟老仓库比会偏袒老仓库。
达标率掉到 50% 以下即为上调 RESERVED_RATIO 的信号。指标本身即监控，不建看板。

手动触发：python -m app.feed.jobs.report
"""
from __future__ import annotations

import sqlite3
import time

from ... import config
from .. import db

TARGET_RATIO = 0.5


def median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    mid = len(s) // 2
    return float(s[mid]) if len(s) % 2 else (s[mid - 1] + s[mid]) / 2


def guarantee_report(conn: sqlite3.Connection, *, now: int | None = None) -> dict:
    now = int(now or time.time())
    since = now - config.DEBUT_WINDOW_HOURS * 3600

    rows = conn.execute(
        "SELECT source, impression_count FROM repos"
        " WHERE status != 'delisted' AND published_at >= ?",
        (since,),
    ).fetchall()

    crawled = [r["impression_count"] for r in rows if r["source"] == "crawled"]
    submitted = [r["impression_count"] for r in rows if r["source"] == "submitted"]
    baseline = median(crawled)

    meeting = sum(1 for v in submitted if v >= baseline)
    ratio = 1.0 if not submitted else meeting / len(submitted)

    return {
        "window_hours": config.DEBUT_WINDOW_HOURS,
        "window_submitted": len(submitted),
        "window_crawled": len(crawled),
        "median_crawled": baseline,
        "meeting": meeting,
        "ratio": round(ratio, 4),
        "reserved_ratio": config.RESERVED_RATIO,
        "suggest_raise": bool(submitted) and ratio < TARGET_RATIO,
    }


def main() -> None:
    conn = db.connect()
    db.init_db(conn)
    out = guarantee_report(conn)
    print(
        f"[report] 窗口 {out['window_hours']}h：投稿 {out['window_submitted']} 个，"
        f"采集曝光中位数 {out['median_crawled']}，达标 {out['meeting']} 个"
        f"（{out['ratio'] * 100:.1f}%）"
    )
    if out["suggest_raise"]:
        print(
            f"[report] 达标率低于 {TARGET_RATIO * 100:.0f}%，"
            f"建议上调 config.RESERVED_RATIO（当前 {out['reserved_ratio']}）"
        )
    conn.close()


if __name__ == "__main__":
    main()
