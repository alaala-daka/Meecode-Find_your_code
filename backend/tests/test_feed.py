"""feed：预留位生效、曝光计数、分类与搜索、delisted 不可见。"""
import time

import pytest
from fastapi.testclient import TestClient

from app import config
from app.feed import db, deps
from app.main import app

NOW = 1_700_000_000


@pytest.fixture()
def client(conn, monkeypatch):
    app.dependency_overrides[deps.get_conn] = lambda: conn
    yield TestClient(app)
    app.dependency_overrides.clear()


def add_repo(conn, gid: int, *, source="crawled", status="published",
             quality=3, published_at=NOW, category="开发工具", tagline="卖点"):
    conn.execute(
        "INSERT INTO repos (github_id, full_name, owner_login, language, source, status,"
        " quality, published_at, category, tagline_zh, screened)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,1)",
        (gid, f"dev{gid}/proj{gid}", f"dev{gid}", "Python", source, status,
         quality, published_at, category, tagline),
    )
    conn.commit()


def test_health(client):
    assert client.get("/api/health").json()["ok"] is True


def test_feed_shows_published_and_pending_claim(conn, client):
    """采集仓库入库即 pending_claim，必须能上首页 —— 否则第二目的落空。
    只有 delisted（作者 opt-out）不可见。"""
    add_repo(conn, 1, status="published")
    add_repo(conn, 2, status="pending_claim")
    add_repo(conn, 3, status="delisted")
    names = {c["full_name"] for c in client.get("/api/feed").json()["items"]}
    assert names == {"dev1/proj1", "dev2/proj2"}


def test_feed_reserves_slots_for_recent_submissions(conn, client, monkeypatch):
    monkeypatch.setattr(config, "FEED_PAGE_SIZE", 10)
    for i in range(30):
        # 采集侧质量 5 > 投稿质量 1，且同样新鲜：纯 score 投稿永远排不进
        # 第一页 —— 只有预留位接线能让低质投稿上榜，测试才具区分度
        add_repo(conn, 100 + i, source="crawled", quality=5,
                 published_at=int(time.time()))
    for i in range(5):
        # 投稿须在 72h 首发窗口内才占预留位（spec：预留位只给窗口内投稿），
        # 故 published_at 取真实当前时间，与路由内 time.time() 对齐
        add_repo(conn, 200 + i, source="submitted", quality=1,
                 published_at=int(time.time()))  # 质量最低
    items = client.get("/api/feed").json()["items"]
    assert len(items) == 10
    n_sub = sum(1 for c in items if c["source"] == "submitted")
    assert n_sub >= 4  # ceil(10*0.4)：低质投稿也拿到预留位


def test_feed_bumps_impression_count(conn, client):
    add_repo(conn, 1)
    client.get("/api/feed")
    client.get("/api/feed")
    row = conn.execute("SELECT impression_count FROM repos WHERE github_id=1").fetchone()
    assert row["impression_count"] == 2


def test_feed_does_not_bump_repos_not_returned(conn, client, monkeypatch):
    monkeypatch.setattr(config, "FEED_PAGE_SIZE", 1)
    add_repo(conn, 1, published_at=NOW)
    add_repo(conn, 2, published_at=NOW - 90 * 86400)  # 很旧，排第二页
    client.get("/api/feed")
    counts = {r["github_id"]: r["impression_count"]
              for r in conn.execute("SELECT github_id, impression_count FROM repos")}
    assert counts[1] == 1 and counts[2] == 0


def test_feed_filters_by_category(conn, client):
    add_repo(conn, 1, category="开发工具")
    add_repo(conn, 2, category="AI 与机器学习")
    items = client.get("/api/feed", params={"category": "AI 与机器学习"}).json()["items"]
    assert [c["full_name"] for c in items] == ["dev2/proj2"]


def test_feed_rejects_unknown_category(client):
    assert client.get("/api/feed", params={"category": "编造的"}).status_code == 422


def test_feed_pagination_has_no_overlap(conn, client, monkeypatch):
    monkeypatch.setattr(config, "FEED_PAGE_SIZE", 5)
    for i in range(12):
        add_repo(conn, 300 + i, published_at=NOW - i * 3600)
    p1 = {c["id"] for c in client.get("/api/feed", params={"page": 1}).json()["items"]}
    p2 = {c["id"] for c in client.get("/api/feed", params={"page": 2}).json()["items"]}
    assert len(p1) == len(p2) == 5 and not (p1 & p2)


def test_feed_card_carries_cover_inputs(conn, client):
    add_repo(conn, 1)
    card = client.get("/api/feed").json()["items"][0]
    for key in ("language", "topics", "stars", "source", "tagline_zh", "owner_login"):
        assert key in card  # 前端 SVG 封面所需


def test_search_matches_chinese_tagline(conn, client):
    add_repo(conn, 1, tagline="给 Agent 的最小运行时")
    add_repo(conn, 2, tagline="一个数据可视化工具")
    items = client.get("/api/search", params={"q": "运行时"}).json()["items"]
    assert [c["full_name"] for c in items] == ["dev1/proj1"]


def test_search_includes_pending_claim(conn, client):
    add_repo(conn, 1, status="pending_claim", tagline="待认领的采集仓库")
    items = client.get("/api/search", params={"q": "待认领"}).json()["items"]
    assert [c["full_name"] for c in items] == ["dev1/proj1"]


def test_search_empty_query_returns_empty(client):
    assert client.get("/api/search", params={"q": "  "}).json()["items"] == []


def test_search_special_chars_do_not_crash(conn, client):
    add_repo(conn, 1)
    for q in ('"', "AND", "*", "a OR b", "NEAR("):
        assert client.get("/api/search", params={"q": q}).status_code == 200


def test_search_excludes_delisted(conn, client):
    add_repo(conn, 1, status="delisted", tagline="给 Agent 的最小运行时")
    assert client.get("/api/search", params={"q": "运行时"}).json()["items"] == []
