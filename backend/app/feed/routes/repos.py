"""仓库详情与文件预览。

文件预览走 GitHub API 实时代理 —— 绝不 clone、绝不落地仓库文件。
GitHub 故障一律降级为空内容 + error 文案，由前端提示「去 GitHub 查看」。
降级结果不进缓存：GitHubError 穿过 lru_cache 往外抛（抛异常的调用不会被
缓存），下次请求自动重试，限流窗口过去即恢复（见 spec 第 9 节）。
"""
from __future__ import annotations

import sqlite3
import time
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ... import config
from .. import auth, github
from ..deps import get_conn
from ..schemas import FileOut, RepoDetail, TreeEntry, TreeOut

router = APIRouter()


def _load(conn: sqlite3.Connection, repo_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT * FROM repos WHERE id = ? AND status != 'delisted'", (repo_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="仓库不存在或已下架")
    return row


def _safe_path(path: str) -> str:
    """只允许仓库内相对路径：拒绝 .. 与绝对路径，防路径穿越。"""
    p = (path or "").strip().replace("\\", "/")
    if not p or p.startswith("/") or ".." in p.split("/"):
        raise HTTPException(status_code=422, detail="非法文件路径")
    return p


@router.get("/repos/{repo_id}", response_model=RepoDetail)
def get_repo(
    repo_id: int,
    request: Request,
    conn: sqlite3.Connection = Depends(get_conn),
) -> RepoDetail:
    row = _load(conn, repo_id)
    conn.execute(
        "UPDATE repos SET repo_view_count = repo_view_count + 1 WHERE id = ?", (repo_id,)
    )

    user = auth.current_user(request, conn)
    liked = favorited = False
    if user is not None:
        conn.execute(
            "INSERT INTO interactions (user_id, repo_id, kind, updated_at)"
            " VALUES (?,?,'visit',?)"
            " ON CONFLICT(user_id, repo_id, kind) DO UPDATE SET updated_at = excluded.updated_at",
            (user["id"], repo_id, int(time.time())),
        )
        kinds = {
            r["kind"] for r in conn.execute(
                "SELECT kind FROM interactions WHERE user_id = ? AND repo_id = ?",
                (user["id"], repo_id),
            )
        }
        liked, favorited = "like" in kinds, "favorite" in kinds
    conn.commit()

    giscus = None
    try:
        giscus = github.get_discussion_meta(row["full_name"])
    except github.GitHubError:
        giscus = None  # 获取失败时前端隐藏评论区，不阻塞仓库页

    return RepoDetail(
        id=row["id"], github_id=row["github_id"], full_name=row["full_name"],
        owner_login=row["owner_login"], language=row["language"],
        topics=[t for t in (row["topics"] or "").split(",") if t],
        stars=row["stars"], license=row["license"], readme_md=row["readme_md"],
        tagline_zh=row["tagline_zh"], intro_zh=row["intro_zh"], category=row["category"],
        cover_url=row["cover_url"], source=row["source"], status=row["status"],
        default_branch=row["default_branch"], published_at=row["published_at"],
        github_url=f"https://github.com/{row['full_name']}",
        claimed=row["claimed_by"] is not None, liked=liked, favorited=favorited,
        giscus_repo_id=(giscus or {}).get("repo_id", ""),
        giscus_category=(giscus or {}).get("category", ""),
        giscus_category_id=(giscus or {}).get("category_id", ""),
    )


@lru_cache(maxsize=config.TREE_CACHE_SIZE)
def _cached_tree(full_name: str, branch: str) -> tuple[tuple, str]:
    """缓存文件树，省 GitHub 配额。不落库（见 spec 第 7 节）。

    GitHubError 直接往外抛：lru_cache 不缓存抛异常的调用，
    降级结果不会卡在缓存里，下次请求自然重试。
    """
    entries = github.get_tree(full_name, branch, interactive=True)
    return tuple((e["path"], e["type"], e.get("size", 0)) for e in entries), ""


@router.get("/repos/{repo_id}/tree", response_model=TreeOut)
def get_repo_tree(
    repo_id: int, conn: sqlite3.Connection = Depends(get_conn)
) -> TreeOut:
    row = _load(conn, repo_id)
    try:
        packed, error = _cached_tree(row["full_name"], row["default_branch"])
    except github.GitHubError as exc:
        packed, error = (), f"暂时无法读取文件列表：{exc}"
    return TreeOut(
        entries=[TreeEntry(path=p, type=t, size=s) for p, t, s in packed], error=error
    )


@lru_cache(maxsize=config.FILE_CACHE_SIZE)
def _cached_file(full_name: str, path: str, branch: str) -> tuple[str, str]:
    """缓存文件内容。GitHubError 往外抛（不进缓存）；
    二进制判定与截断由内容决定，结果可安全缓存。
    """
    content = github.get_file(full_name, path, branch, interactive=True)
    if "\x00" in content[:4096]:
        return "", "该文件为二进制，请到 GitHub 查看"
    if len(content) > config.MAX_FILE_CHARS:
        return content[:config.MAX_FILE_CHARS], "文件过大，已截断，完整内容请到 GitHub 查看"
    return content, ""


@router.get("/repos/{repo_id}/files", response_model=FileOut)
def get_repo_file(
    repo_id: int,
    path: str = Query(...),
    conn: sqlite3.Connection = Depends(get_conn),
) -> FileOut:
    row = _load(conn, repo_id)
    safe = _safe_path(path)
    try:
        content, error = _cached_file(row["full_name"], safe, row["default_branch"])
    except github.GitHubError as exc:
        content, error = "", f"暂时无法读取该文件：{exc}"
    return FileOut(
        path=safe, content=content, error=error,
        github_url=f"https://github.com/{row['full_name']}/blob/{row['default_branch']}/{safe}",
    )
