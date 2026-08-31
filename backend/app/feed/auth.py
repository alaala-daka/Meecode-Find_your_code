"""登录态：GitHub OAuth 换取一次性 token 读身份，随即丢弃。

觅码不存 access_token（见 Global Constraints）：登录态是 stdlib HMAC 签名
cookie，格式 base64(user_id:issued_at).hexsig。数据库泄露也带不走任何人的
GitHub 权限。
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import sqlite3
import time

from fastapi import HTTPException, Request

from .. import config


def _sig(body: str) -> str:
    return hmac.new(
        config.SESSION_SECRET.encode(), body.encode(), hashlib.sha256
    ).hexdigest()


def sign(user_id: int, now: int | None = None) -> str:
    issued = int(now or time.time())
    body = base64.urlsafe_b64encode(f"{user_id}:{issued}".encode()).decode().rstrip("=")
    return f"{body}.{_sig(body)}"


def verify(token: str, now: int | None = None) -> int | None:
    """校验签名与有效期。任何异常一律当作未登录，不抛。

    签名比对放 try 内：非 ASCII 签名段会让 compare_digest 抛 TypeError
    （Starlette 以 latin-1 解码头，原始字节可能进来），一律按未登录处理。
    """
    if not token or "." not in token:
        return None
    body, _, sig = token.partition(".")
    try:
        if not hmac.compare_digest(sig, _sig(body)):
            return None
        padded = body + "=" * (-len(body) % 4)
        raw = base64.urlsafe_b64decode(padded).decode()
        user_id_s, _, issued_s = raw.partition(":")
        user_id, issued = int(user_id_s), int(issued_s)
    except (ValueError, UnicodeDecodeError, TypeError):
        return None
    if int(now or time.time()) - issued > config.SESSION_MAX_AGE:
        return None
    return user_id


def upsert_user(conn: sqlite3.Connection, gh_user: dict) -> int:
    """按 github_id 落地用户。login/头像随 GitHub 刷新，bio 是觅码本地数据不动。"""
    conn.execute(
        """
        INSERT INTO users (github_id, login, avatar_url)
        VALUES (?,?,?)
        ON CONFLICT(github_id) DO UPDATE SET
            login = excluded.login,
            avatar_url = excluded.avatar_url
        """,
        (gh_user["id"], gh_user.get("login", ""), gh_user.get("avatar_url", "")),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id FROM users WHERE github_id = ?", (gh_user["id"],)
    ).fetchone()
    return row["id"]


def current_user(request: Request, conn: sqlite3.Connection) -> sqlite3.Row | None:
    user_id = verify(request.cookies.get(config.SESSION_COOKIE, ""))
    if user_id is None:
        return None
    return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def require_user(request: Request, conn: sqlite3.Connection) -> sqlite3.Row:
    user = current_user(request, conn)
    if user is None:
        raise HTTPException(status_code=401, detail="请先用 GitHub 账号登录")
    return user
