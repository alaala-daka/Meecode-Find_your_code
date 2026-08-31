"""投稿 / 认领 / 下架 —— 第一目的的核心接口。

归属校验：github_id 必须出现在「当前用户自己的公开仓库列表」里，
故无需第二次 OAuth，也无需存 access_token。
认领不是独立功能：github_id 命中已采集记录即复用（见 spec 第 5 节）。
LLM 与 GitHub 故障一律不阻塞发布（见 spec 第 9 节）。
"""
from __future__ import annotations

import sqlite3
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from ... import config
from .. import auth, github, screening
from ..deps import get_conn
from ..schemas import DraftIn, DraftResult, MyRepoOut, SubmitIn

router = APIRouter()


def _own_repo(login: str, github_id: int) -> dict:
    """从用户自有仓库列表里找目标；找不到即非本人所有。"""
    try:
        mine = github.list_user_repos(login)
    except github.GitHubError as exc:
        raise HTTPException(status_code=502, detail=f"无法读取你的仓库列表：{exc}") from exc
    for r in mine:
        if r["id"] == github_id:
            return r
    raise HTTPException(status_code=404, detail="未在你的 GitHub 公开仓库中找到该项目")


@router.get("/my/github-repos", response_model=list[MyRepoOut])
def my_github_repos(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> list[MyRepoOut]:
    user = auth.require_user(request, conn)
    try:
        mine = github.list_user_repos(user["login"])
    except github.GitHubError as exc:
        raise HTTPException(status_code=502, detail=f"无法读取你的仓库列表：{exc}") from exc

    existing = {
        r["github_id"]: r
        for r in conn.execute("SELECT id, github_id, status FROM repos")
    }
    out: list[MyRepoOut] = []
    for r in mine:
        if r.get("owner_login") != user["login"]:
            continue  # 只展示当前用户自己的公开仓库
        hit = existing.get(r["id"])
        out.append(MyRepoOut(
            github_id=r["id"], full_name=r["full_name"], language=r.get("language", ""),
            stars=r.get("stars", 0),
            submitted_id=hit["id"] if hit else None,
            status=hit["status"] if hit else "",
        ))
    return out


@router.post("/submit")
def submit(
    body: SubmitIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> dict:
    user = auth.require_user(request, conn)
    if not body.tagline_zh.strip():
        raise HTTPException(status_code=422, detail="请填写一句话卖点")
    if body.category not in config.CATEGORIES:
        raise HTTPException(status_code=422, detail=f"未知分类：{body.category}")

    existing = conn.execute(
        "SELECT * FROM repos WHERE github_id = ?", (body.github_id,)
    ).fetchone()
    if existing is not None and existing["owner_login"] != user["login"]:
        raise HTTPException(status_code=403, detail="只能投稿自己拥有的仓库")

    gh = _own_repo(user["login"], body.github_id)
    if gh["owner_login"] != user["login"]:
        raise HTTPException(status_code=403, detail="只能投稿自己拥有的仓库")

    # README / 文件树拉不到也要能发布：作者文案已足够展示
    readme, tree = "", []
    try:
        readme = github.get_readme(gh["full_name"])
        tree = github.get_tree(gh["full_name"], gh.get("default_branch", "main"))
    except github.GitHubError as exc:
        print(f"[submit] {gh['full_name']} 元数据拉取失败，继续发布：{exc}")

    # 精筛只影响排序，不作准入；失败取中性分并标记待补齐
    quality, screened = config.NEUTRAL_QUALITY, 0
    try:
        result = screening.screen_repo(gh["full_name"], readme, tree)
        quality, screened = result.quality, 1
    except Exception as exc:
        print(f"[submit] {gh['full_name']} 精筛失败，取中性分继续发布：{exc}")

    now = int(time.time())
    if existing is not None:
        # 认领 / 重投：就地更新，计数与 id 一律保留。
        # published_at 刷成 now：认领即视为「作者首次推广」，重新起算 72 小时
        # 首发窗口。否则认领一个 30 天前采集的仓库将拿不到任何保底曝光，
        # 与「投了就有一波真实曝光」的承诺矛盾。
        first_publish = existing["source"] != "submitted"
        conn.execute(
            """
            UPDATE repos SET
                source = 'submitted', status = 'published', claimed_by = ?,
                tagline_zh = ?, intro_zh = ?, category = ?, cover_url = ?,
                quality = ?, screened = ?, readme_md = ?,
                stars = ?, language = ?, topics = ?, default_branch = ?,
                published_at = CASE WHEN ? THEN ? ELSE published_at END
            WHERE id = ?
            """,
            (user["id"], body.tagline_zh.strip(), body.intro_zh.strip(), body.category,
             body.cover_url, quality, screened, readme or existing["readme_md"],
             gh.get("stars", 0), gh.get("language", ""), ",".join(gh.get("topics") or []),
             gh.get("default_branch", "main"),
             1 if first_publish else 0, now, existing["id"]),
        )
        conn.commit()
        return {"repo_id": existing["id"]}

    cur = conn.execute(
        """
        INSERT INTO repos (
            github_id, full_name, owner_login, language, topics, stars, pushed_at,
            license, readme_md, default_branch, source, status, claimed_by,
            tagline_zh, intro_zh, category, cover_url, quality, screened, published_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?, 'submitted', 'published', ?,?,?,?,?,?,?,?)
        """,
        (gh["id"], gh["full_name"], gh["owner_login"], gh.get("language", ""),
         ",".join(gh.get("topics") or []), gh.get("stars", 0), gh.get("pushed_at", 0),
         gh.get("license", ""), readme, gh.get("default_branch", "main"),
         user["id"], body.tagline_zh.strip(), body.intro_zh.strip(), body.category,
         body.cover_url, quality, screened, now),
    )
    conn.commit()
    return {"repo_id": cur.lastrowid}


@router.post("/repos/{repo_id}/delist")
def delist(
    repo_id: int, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> dict:
    """opt-out：GitHub 侧 owner 即可下架，无需先认领（合规底线）。"""
    user = auth.require_user(request, conn)
    row = conn.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="仓库不存在")
    if row["owner_login"] != user["login"] and row["claimed_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="只能下架自己的仓库")
    conn.execute("UPDATE repos SET status = 'delisted' WHERE id = ?", (repo_id,))
    conn.commit()
    return {"ok": True}


@router.post("/ai-draft", response_model=DraftResult)
def ai_draft(
    body: DraftIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> DraftResult:
    """「AI 帮我写」：失败返回空串，由前端提示手写，绝不 500。"""
    user = auth.require_user(request, conn)
    gh = _own_repo(user["login"], body.github_id)
    try:
        readme = github.get_readme(gh["full_name"])
        tree = github.get_tree(gh["full_name"], gh.get("default_branch", "main"))
        result = screening.screen_repo(gh["full_name"], readme, tree)
    except Exception as exc:
        print(f"[ai-draft] {gh['full_name']} 草稿生成失败：{exc}")
        return DraftResult()
    return DraftResult(tagline_zh=result.tagline_zh, intro_zh=result.why_zh)
