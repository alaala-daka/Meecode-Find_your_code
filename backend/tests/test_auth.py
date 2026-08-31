"""签名 cookie：不存 GitHub token，登录态自证。伪造与过期必须被拒。"""
import pytest

from app.feed import auth
from app import config

NOW = 1_700_000_000


def test_sign_then_verify_roundtrip():
    assert auth.verify(auth.sign(7, NOW), NOW) == 7


def test_tampered_payload_is_rejected():
    token = auth.sign(7, NOW)
    body, sig = token.split(".", 1)
    forged = auth.base64.urlsafe_b64encode(b"9:%d" % NOW).decode().rstrip("=")
    assert auth.verify(f"{forged}.{sig}", NOW) is None


def test_wrong_signature_is_rejected():
    token = auth.sign(7, NOW)
    body, _sig = token.split(".", 1)
    assert auth.verify(f"{body}.deadbeef", NOW) is None


def test_expired_token_is_rejected():
    old = auth.sign(7, NOW - config.SESSION_MAX_AGE - 10)
    assert auth.verify(old, NOW) is None


def test_garbage_token_is_rejected():
    for junk in ("", ".", "no-dot", "a.b.c", "!!!.???", "中文.签名"):
        assert auth.verify(junk, NOW) is None


def test_non_ascii_signature_is_rejected():
    """Starlette 以 latin-1 解码头，非 ASCII 签名段必须当作未登录，不抛 TypeError。"""
    assert auth.verify("abc.中文签名", NOW) is None
    assert auth.verify("abc.%sdeadbeef" % chr(255), NOW) is None


def test_secret_change_invalidates_tokens(monkeypatch):
    token = auth.sign(7, NOW)
    monkeypatch.setattr(config, "SESSION_SECRET", "another-secret")
    assert auth.verify(token, NOW) is None


def test_upsert_user_is_idempotent(conn):
    gh = {"id": 555, "login": "alaala", "avatar_url": "https://a/x.png"}
    first = auth.upsert_user(conn, gh)
    second = auth.upsert_user(conn, {**gh, "login": "alaala-daka"})
    assert first == second
    row = conn.execute("SELECT * FROM users WHERE id = ?", (first,)).fetchone()
    assert row["login"] == "alaala-daka"  # 改名同步


def test_upsert_user_preserves_bio(conn):
    """GitHub 侧刷新不能抹掉觅码本地签名。"""
    gh = {"id": 556, "login": "u", "avatar_url": ""}
    uid = auth.upsert_user(conn, gh)
    conn.execute("UPDATE users SET bio = '我的签名' WHERE id = ?", (uid,))
    auth.upsert_user(conn, gh)
    assert conn.execute("SELECT bio FROM users WHERE id = ?", (uid,)).fetchone()["bio"] == "我的签名"
