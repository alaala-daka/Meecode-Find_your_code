"""公开用户页:profile 聚合 + 仓库/收藏列表 + 本人限定的浏览历史。"""
from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, Request

from .. import auth
from ..cards import to_card, _card_select
from ..deps import get_conn
from ..schemas import RepoCardOut, UserProfileOut

router = APIRouter()


@router.get("/users/{login}/profile", response_model=UserProfileOut)
def user_profile(login: str, conn: sqlite3.Connection = Depends(get_conn)) -> UserProfileOut:
    """采集仓库的作者可能从未登录过觅码:合成空档案而非 404,个人页不至于报错。"""
    u = conn.execute("SELECT * FROM users WHERE login = ?", (login,)).fetchone()
    agg = conn.execute(
        "SELECT COUNT(*) AS repo_count, COALESCE(SUM(stars), 0) AS star_count"
        " FROM repos WHERE owner_login = ? AND status != 'delisted'", (login,)
    ).fetchone()
    fav = conn.execute(
        "SELECT COUNT(*) AS n FROM interactions i JOIN users tu ON tu.id = i.user_id"
        " WHERE tu.login = ? AND i.kind = 'favorite'", (login,)
    ).fetchone()["n"]
    return UserProfileOut(
        login=login,
        avatar_url=u["avatar_url"] if u else "",
        bio=u["bio"] if u else "",
        repo_count=agg["repo_count"], star_count=agg["star_count"], favorite_count=fav,
    )


@router.get("/users/{login}/repos", response_model=list[RepoCardOut])
def user_repos(login: str, conn: sqlite3.Connection = Depends(get_conn)) -> list[RepoCardOut]:
    rows = conn.execute(
        _card_select("FROM repos r")
        + " WHERE r.owner_login = ? AND r.status != 'delisted'"
        " ORDER BY r.published_at DESC", (login,)
    ).fetchall()
    return [to_card(r) for r in rows]


def _cards_by_kind(conn: sqlite3.Connection, login: str, kind: str) -> list[RepoCardOut]:
    rows = conn.execute(
        _card_select("FROM interactions i JOIN repos r ON r.id = i.repo_id"
                     " JOIN users tu ON tu.id = i.user_id")
        + " WHERE tu.login = ? AND i.kind = ? AND r.status != 'delisted'"
        " ORDER BY i.updated_at DESC, i.id DESC", (login, kind)
    ).fetchall()
    return [to_card(r) for r in rows]


@router.get("/users/{login}/favorites", response_model=list[RepoCardOut])
def user_favorites(login: str, conn: sqlite3.Connection = Depends(get_conn)) -> list[RepoCardOut]:
    return _cards_by_kind(conn, login, "favorite")


@router.get("/users/{login}/history", response_model=list[RepoCardOut])
def user_history(
    login: str, request: Request, conn: sqlite3.Connection = Depends(get_conn)
) -> list[RepoCardOut]:
    """浏览历史仅本人可见;他人/未登录一律空列表(个人页 Promise.all 拉全,不能 403)。"""
    me = auth.current_user(request, conn)
    if me is None or me["login"] != login:
        return []
    return _cards_by_kind(conn, login, "visit")
