"""登录、个人数据、互动切换。

登录仅 GitHub OAuth：觅码账号即 GitHub 账号，无独立注册。
OAuth scope 只要 read:user —— 不申请 repo（不读私有代码，见 spec 账号边界）。
"""
from __future__ import annotations

import secrets
import sqlite3
import time
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse

from ... import config
from .. import auth, github
from ..cards import to_card
from ..deps import get_conn
from ..schemas import BioIn, InteractionIn, RepoCard, UserOut

router = APIRouter()

TOGGLEABLE = ("like", "favorite")
OAUTH_STATE_COOKIE = "oauth_state"


@router.get("/auth/github")
def oauth_entry() -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    params = urllib.parse.urlencode({
        "client_id": config.GITHUB_CLIENT_ID,
        "scope": "read:user",  # 只读身份，不要 repo 权限
        "state": state,
    })
    resp = RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")
    resp.set_cookie(
        OAUTH_STATE_COOKIE, state,
        max_age=600, httponly=True, samesite="lax",
    )
    return resp


@router.get("/auth/callback")
def oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    conn: sqlite3.Connection = Depends(get_conn),
) -> RedirectResponse:
    """用 code 换一次性 token 读身份，随即丢弃 token（不入库）。"""
    saved_state = request.cookies.get(OAUTH_STATE_COOKIE, "")
    if not state or not saved_state or not secrets.compare_digest(state, saved_state):
        raise HTTPException(status_code=400, detail="OAuth state 不匹配，请重新登录")

    try:
        token = github.exchange_oauth_code(code)
        gh_user = github.get_authenticated_user(token)
    except github.GitHubError as exc:
        raise HTTPException(status_code=502, detail=f"GitHub 登录失败：{exc}") from exc

    user_id = auth.upsert_user(conn, gh_user)
    resp = RedirectResponse(config.FRONTEND_ORIGIN)
    resp.delete_cookie(OAUTH_STATE_COOKIE)
    resp.set_cookie(
        config.SESSION_COOKIE, auth.sign(user_id),
        max_age=config.SESSION_MAX_AGE, httponly=True, samesite="lax",
    )
    return resp


@router.post("/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(config.SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def get_me(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> UserOut | None:
    user = auth.current_user(request, conn)
    if user is None:
        return None
    return UserOut(id=user["id"], login=user["login"],
                   avatar_url=user["avatar_url"], bio=user["bio"])


@router.put("/me/bio", response_model=UserOut)
def update_bio(
    body: BioIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> UserOut:
    user = auth.require_user(request, conn)
    conn.execute("UPDATE users SET bio = ? WHERE id = ?", (body.bio.strip(), user["id"]))
    conn.commit()
    return UserOut(id=user["id"], login=user["login"],
                   avatar_url=user["avatar_url"], bio=body.bio.strip())


@router.post("/interactions")
def toggle_interaction(
    body: InteractionIn, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> dict:
    """点赞/收藏切换。visit 不走这里 —— 它由详情接口写入。"""
    user = auth.require_user(request, conn)
    if body.kind not in TOGGLEABLE:
        raise HTTPException(status_code=422, detail="kind 只能是 like 或 favorite")
    exists = conn.execute(
        "SELECT id FROM repos WHERE id = ? AND status != 'delisted'", (body.repo_id,)
    ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="仓库不存在或已下架")

    hit = conn.execute(
        "SELECT id FROM interactions WHERE user_id=? AND repo_id=? AND kind=?",
        (user["id"], body.repo_id, body.kind),
    ).fetchone()
    if hit:
        conn.execute("DELETE FROM interactions WHERE id = ?", (hit["id"],))
        active = False
    else:
        conn.execute(
            "INSERT INTO interactions (user_id, repo_id, kind, updated_at) VALUES (?,?,?,?)",
            (user["id"], body.repo_id, body.kind, int(time.time())),
        )
        active = True
    conn.commit()
    return {"active": active}


@router.get("/me/repos", response_model=list[RepoCard])
def my_repos(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> list[RepoCard]:
    """我的仓库：只展示当前可见/可管理的仓库，已下架的不再出现在个人主页。"""
    user = auth.require_user(request, conn)
    rows = conn.execute(
        "SELECT * FROM repos WHERE (owner_login = ? OR claimed_by = ?)"
        " AND status != 'delisted' ORDER BY published_at DESC",
        (user["login"], user["id"]),
    ).fetchall()
    return [to_card(r) for r in rows]


def _by_kind(conn: sqlite3.Connection, user_id: int, kind: str) -> list[RepoCard]:
    """i.id DESC 是必要的兜底：同一秒内的多次访问 updated_at 相同，
    只按 updated_at 排序结果不确定，浏览历史顺序会飘。"""
    rows = conn.execute(
        "SELECT r.* FROM interactions i JOIN repos r ON r.id = i.repo_id"
        " WHERE i.user_id = ? AND i.kind = ? AND r.status != 'delisted'"
        " ORDER BY i.updated_at DESC, i.id DESC",
        (user_id, kind),
    ).fetchall()
    return [to_card(r) for r in rows]


@router.get("/me/favorites", response_model=list[RepoCard])
def my_favorites(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> list[RepoCard]:
    user = auth.require_user(request, conn)
    return _by_kind(conn, user["id"], "favorite")


@router.get("/me/history", response_model=list[RepoCard])
def my_history(
    request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> list[RepoCard]:
    user = auth.require_user(request, conn)
    return _by_kind(conn, user["id"], "visit")
