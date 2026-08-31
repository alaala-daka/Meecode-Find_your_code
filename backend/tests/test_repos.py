"""仓库详情与文件预览：浏览计数、路径穿越防护、GitHub 故障降级。"""
import pytest
from fastapi.testclient import TestClient

from app.feed import auth, deps, github
from app import config
from app.main import app

NOW = 1_700_000_000


@pytest.fixture()
def client(conn, monkeypatch):
    monkeypatch.setattr(config, "GITHUB_MOCK", True)
    app.dependency_overrides[deps.get_conn] = lambda: conn
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def repo_id(conn):
    conn.execute(
        "INSERT INTO repos (github_id, full_name, owner_login, language, source, status,"
        " quality, published_at, readme_md, default_branch, tagline_zh, screened)"
        " VALUES (1, 'demo/agent-runtime', 'demo', 'TypeScript', 'crawled',"
        " 'published', 4, ?, '# 说明', 'main', '最小运行时', 1)", (NOW,))
    conn.commit()
    return conn.execute("SELECT id FROM repos WHERE github_id=1").fetchone()["id"]


def test_detail_returns_repo(client, repo_id):
    body = client.get(f"/api/repos/{repo_id}").json()
    assert body["full_name"] == "demo/agent-runtime"
    assert body["readme_md"] == "# 说明"
    assert body["github_url"] == "https://github.com/demo/agent-runtime"


def test_detail_bumps_repo_view_count(conn, client, repo_id):
    client.get(f"/api/repos/{repo_id}")
    client.get(f"/api/repos/{repo_id}")
    row = conn.execute("SELECT repo_view_count FROM repos WHERE id=?", (repo_id,)).fetchone()
    assert row["repo_view_count"] == 2


def test_detail_records_visit_for_logged_in_user(conn, client, repo_id):
    uid = auth.upsert_user(conn, {"id": 42, "login": "u", "avatar_url": ""})
    client.cookies.set(config.SESSION_COOKIE, auth.sign(uid))
    client.get(f"/api/repos/{repo_id}")
    client.get(f"/api/repos/{repo_id}")
    rows = conn.execute(
        "SELECT * FROM interactions WHERE kind='visit' AND user_id=?", (uid,)).fetchall()
    assert len(rows) == 1  # visit 去重，供浏览历史


def test_detail_no_visit_row_for_anonymous(conn, client, repo_id):
    client.get(f"/api/repos/{repo_id}")
    assert conn.execute("SELECT count(*) c FROM interactions").fetchone()["c"] == 0


def test_detail_includes_giscus_meta(client, repo_id, monkeypatch):
    monkeypatch.setattr(github, "get_discussion_meta", lambda fn: {
        "repo_id": "R_test",
        "category": "General",
        "category_id": "D_test",
    })
    body = client.get(f"/api/repos/{repo_id}").json()
    assert body["giscus_repo_id"] == "R_test"
    assert body["giscus_category"] == "General"
    assert body["giscus_category_id"] == "D_test"


def test_mock_giscus_meta_is_disabled(monkeypatch):
    monkeypatch.setattr(config, "GITHUB_MOCK", True)
    assert github.get_discussion_meta("demo/agent-runtime") is None


def test_detail_giscus_meta_degrades_when_github_fails(client, repo_id, monkeypatch):
    monkeypatch.setattr(config, "GITHUB_MOCK", False)
    def boom(*a, **kw):
        raise github.GitHubError("限流")
    monkeypatch.setattr(github, "get_discussion_meta", boom)
    body = client.get(f"/api/repos/{repo_id}").json()
    assert body["giscus_repo_id"] == ""
    assert body["giscus_category"] == ""
    assert body["giscus_category_id"] == ""


def test_detail_404_for_unknown(client):
    assert client.get("/api/repos/9999").status_code == 404


def test_detail_404_for_delisted(conn, client, repo_id):
    conn.execute("UPDATE repos SET status='delisted' WHERE id=?", (repo_id,))
    conn.commit()
    assert client.get(f"/api/repos/{repo_id}").status_code == 404


def test_tree_returns_entries(client, repo_id):
    entries = client.get(f"/api/repos/{repo_id}/tree").json()["entries"]
    assert any(e["path"] == "src/main.ts" for e in entries)


def test_file_returns_content(client, repo_id):
    body = client.get(f"/api/repos/{repo_id}/files", params={"path": "src/main.ts"}).json()
    assert "src/main.ts" in body["content"]
    assert body["github_url"].endswith("/blob/main/src/main.ts")


def test_file_rejects_path_traversal(client, repo_id):
    for bad in ("../secrets", "/etc/passwd", "a/../../b", "..\\win"):
        resp = client.get(f"/api/repos/{repo_id}/files", params={"path": bad})
        assert resp.status_code == 422, bad


def test_file_rejects_empty_path(client, repo_id):
    assert client.get(f"/api/repos/{repo_id}/files", params={"path": " "}).status_code == 422


def test_file_degrades_when_github_fails(client, repo_id, monkeypatch):
    """GitHub 故障不能 500，前端要显示「去 GitHub 查看」。"""
    monkeypatch.setattr(config, "GITHUB_MOCK", False)
    def boom(*a, **kw):
        raise github.GitHubError("限流")
    monkeypatch.setattr(github, "get_file", boom)
    resp = client.get(f"/api/repos/{repo_id}/files", params={"path": "src/main.ts"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["content"] == "" and body["error"]


def test_tree_degrades_when_github_fails(client, repo_id, monkeypatch):
    monkeypatch.setattr(config, "GITHUB_MOCK", False)
    def boom(*a, **kw):
        raise github.GitHubError("限流")
    monkeypatch.setattr(github, "get_tree", boom)
    body = client.get(f"/api/repos/{repo_id}/tree").json()
    assert body["entries"] == [] and body["error"]


def test_binary_file_is_not_dumped(client, repo_id, monkeypatch):
    """图片等二进制不该塞进 JSON，给个提示即可。"""
    monkeypatch.setattr(config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github, "get_file", lambda *a, **kw: "\x00\x01\x02binary")
    body = client.get(f"/api/repos/{repo_id}/files", params={"path": "logo.png"}).json()
    assert body["content"] == "" and "二进制" in body["error"]


def test_oversized_file_is_truncated(client, repo_id, monkeypatch):
    """超大文件截断到 MAX_FILE_CHARS，提示去 GitHub 看完整内容。"""
    monkeypatch.setattr(config, "GITHUB_MOCK", False)
    monkeypatch.setattr(
        github, "get_file", lambda *a, **kw: "x" * (config.MAX_FILE_CHARS + 10))
    body = client.get(f"/api/repos/{repo_id}/files", params={"path": "big.log"}).json()
    assert len(body["content"]) == config.MAX_FILE_CHARS
    assert "截断" in body["error"]
