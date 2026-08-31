"""排序公式与首页预留位。

score = 新鲜度 × 质量分 × (1 + 点击率) × 首发加权

加权与预留位各管一件事：加权让优质投稿排更前（相对量），预留位保证投稿
拿到曝光下限（绝对量）。权重全在 config，照日报手调。
"""
from __future__ import annotations

import math
from typing import Mapping, Sequence, TypeVar

from .. import config

T = TypeVar("T")


def freshness(published_at: int, now: int) -> float:
    """指数衰减，半衰期见 config。未来时间戳（时钟偏差）夹到 1。"""
    age_hours = max(0.0, (now - published_at) / 3600)
    return 0.5 ** (age_hours / config.FRESHNESS_HALFLIFE_HOURS)


def ctr(repo_view_count: int, impression_count: int) -> float:
    """点击率 = 浏览 / 曝光。曝光为 0 时取 0，不除零；上限夹 1，防重复打开刷分。"""
    if impression_count <= 0:
        return 0.0
    return min(1.0, repo_view_count / impression_count)


def debut_boost(source: str, published_at: int, now: int) -> float:
    """首发加权：仅投稿仓库、仅发布后 DEBUT_WINDOW_HOURS 内。"""
    if source != "submitted":
        return 1.0
    within = (now - published_at) <= config.DEBUT_WINDOW_HOURS * 3600
    return config.DEBUT_BOOST if within else 1.0


def score(repo: Mapping, now: int) -> float:
    quality = repo["quality"] or config.NEUTRAL_QUALITY
    return (
        freshness(repo["published_at"], now)
        * quality
        * (1 + ctr(repo["repo_view_count"], repo["impression_count"]))
        * debut_boost(repo["source"], repo["published_at"], now)
    )


def reserved_slots(page_size: int) -> int:
    """每页留给窗口内投稿的位数：ceil(page_size × RESERVED_RATIO)。"""
    return math.ceil(page_size * config.RESERVED_RATIO)


def interleave(
    submitted: Sequence[T], crawled: Sequence[T], page_size: int
) -> list[T]:
    """把两侧交织成一条全序：每 page_size 个一块，块内先放预留位份额的投稿。

    两个入参都须已按 score 降序 —— 预留位从头取即为「优先高分投稿」。
    对全量成序而非只算首页，是为了翻页无重叠、无遗漏：路由层直接切片即可。
    任一侧耗尽后由另一侧补满，不留空位。
    """
    if page_size <= 0:
        return []
    want = reserved_slots(page_size)
    out: list[T] = []
    si = ci = 0
    while si < len(submitted) or ci < len(crawled):
        take_s = min(want, len(submitted) - si)
        block = list(submitted[si:si + take_s])
        si += take_s
        take_c = min(page_size - len(block), len(crawled) - ci)
        block += list(crawled[ci:ci + take_c])
        ci += take_c
        if len(block) < page_size:  # 采集不足，用剩余投稿补满本块
            extra = min(page_size - len(block), len(submitted) - si)
            block += list(submitted[si:si + extra])
            si += extra
        if not block:
            break
        out += block
    return out


def assemble_feed(
    submitted: Sequence[T], crawled: Sequence[T], page_size: int
) -> list[T]:
    """首页一屏：interleave 的第一块。"""
    return interleave(submitted, crawled, page_size)[:page_size]
