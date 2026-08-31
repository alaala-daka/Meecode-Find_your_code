"""采集日跑任务：搜索 → 规则粗筛 → LLM 精筛 → 按分数取前 N 入库。

与 Web 请求完全解耦：本任务挂掉不影响首页出内容。
日配额（CRAWL_DAILY_QUOTA）是防止采集冲淡投稿的第一道闸。
单仓库失败一律跳过并计入 skipped，绝不中断整批（见 spec 第 9 节）。

手动触发：python -m app.jobs.crawl
"""
from __future__ import annotations

import sqlite3
import time

from ... import config
from .. import db, github, ranking, screening
from ..schemas import ScreeningResult


def crawl_once(conn: sqlite3.Connection, *, now: int | None = None) -> dict:
    now = int(now or time.time())
    stats = {"scanned": 0, "passed_rules": 0, "screened_in": 0, "inserted": 0, "skipped": 0}
    candidates: list[tuple[float, dict, str, ScreeningResult]] = []

    known = {r["github_id"] for r in conn.execute("SELECT github_id FROM repos")}

    for language in config.CRAWL_LANGUAGES:
        try:
            found = github.search_new_repos(language, now=now)
        except github.GitHubError as exc:
            print(f"[crawl] 搜索 {language} 失败，跳过该语言：{exc}")
            continue

        for repo in found:
            stats["scanned"] += 1
            if repo["id"] in known:
                continue  # 已入库：不重复、不覆盖作者文案
            try:
                readme = github.get_readme(repo["full_name"])
                tree = github.get_tree(repo["full_name"], repo.get("default_branch", "main"))
                followers = github.get_user(repo["owner_login"]).get("followers", 0)
            except github.GitHubError as exc:
                stats["skipped"] += 1
                print(f"[crawl] 取 {repo['full_name']} 元数据失败，跳过：{exc}")
                continue

            ok, why = screening.passes_rules(repo, readme, tree, followers, now)
            if not ok:
                continue
            stats["passed_rules"] += 1

            try:
                result = screening.screen_repo(repo["full_name"], readme, tree)
            except Exception as exc:  # LLM 故障：跳过，下轮重试
                stats["skipped"] += 1
                print(f"[crawl] {repo['full_name']} 精筛失败，跳过：{exc}")
                continue

            if not result.is_real_project:
                continue  # 采集端：精筛不达标即丢弃
            stats["screened_in"] += 1

            repo["star_velocity"] = screening.star_velocity(
                repo.get("stars", 0), repo.get("created_at", now), now
            )
            preview = {
                "quality": result.quality, "published_at": now,
                "source": "crawled", "impression_count": 0, "repo_view_count": 0,
            }
            candidates.append((ranking.score(preview, now), repo, readme, result))

    # 日配额：只取分数最高的 N 条，防止采集冲淡投稿
    candidates.sort(key=lambda c: c[0], reverse=True)
    for _score, repo, readme, result in candidates[: config.CRAWL_DAILY_QUOTA]:
        upsert_crawled(conn, repo, readme, result, now)
        stats["inserted"] += 1
    conn.commit()
    return stats


def upsert_crawled(
    conn: sqlite3.Connection, repo: dict, readme: str, result: ScreeningResult, now: int
) -> int:
    """插入采集仓库。github_id 冲突时只刷新 GitHub 侧字段，绝不动觅码侧文案。"""
    cur = conn.execute(
        """
        INSERT INTO repos (
            github_id, full_name, owner_login, language, topics, stars, star_velocity,
            pushed_at, license, readme_md, default_branch,
            source, status, tagline_zh, intro_zh, category, quality, screened, published_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'crawled', 'pending_claim', ?,?,?,?,1,?)
        ON CONFLICT(github_id) DO UPDATE SET
            stars = excluded.stars,
            star_velocity = excluded.star_velocity,
            pushed_at = excluded.pushed_at,
            readme_md = excluded.readme_md
        """,
        (
            repo["id"], repo["full_name"], repo["owner_login"], repo.get("language", ""),
            ",".join(repo.get("topics") or []), repo.get("stars", 0),
            repo.get("star_velocity", 0.0), repo.get("pushed_at", 0),
            repo.get("license", ""), readme, repo.get("default_branch", "main"),
            result.tagline_zh, result.why_zh, result.category, result.quality, now,
        ),
    )
    return cur.lastrowid


def main() -> None:
    conn = db.connect()
    db.init_db(conn)
    stats = crawl_once(conn)
    print(f"[crawl] 完成：{stats}")
    conn.close()


if __name__ == "__main__":
    main()
