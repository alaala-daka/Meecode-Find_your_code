"""GitHub 客户端：mock 模式、限流退避、错误降级。不打真实网络。"""
import httpx
import pytest

from app.feed import github


def test_mock_mode_returns_fixtures(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", True)
    repos = github.search_new_repos("Python")
    assert repos and all("full_name" in r for r in repos)
    assert github.get_readme(repos[0]["full_name"]).strip()


def test_mock_tree_has_code_files(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", True)
    tree = github.get_tree("demo/agent-runtime", "main")
    assert sum(1 for t in tree if t["type"] == "blob") >= 5


def test_rate_limit_retries_then_succeeds(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github.config, "GITHUB_TOKEN", "t")
    monkeypatch.setattr(github.time, "sleep", lambda _s: None)  # 测试不真睡
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(403, headers={"X-RateLimit-Remaining": "0", "Retry-After": "1"})
        return httpx.Response(200, json={"followers": 12})

    monkeypatch.setattr(github, "_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    assert github.get_user("someone")["followers"] == 12
    assert calls["n"] == 2


def test_gives_up_after_max_retries(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github.config, "GITHUB_TOKEN", "t")
    monkeypatch.setattr(github.time, "sleep", lambda _s: None)
    handler = lambda r: httpx.Response(403, headers={"X-RateLimit-Remaining": "0"})
    monkeypatch.setattr(github, "_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(github.GitHubError):
        github.get_user("someone")


def test_missing_readme_returns_empty_not_raise(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github.config, "GITHUB_TOKEN", "t")
    handler = lambda r: httpx.Response(404, json={"message": "Not Found"})
    monkeypatch.setattr(github, "_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    assert github.get_readme("a/b") == ""


def test_readme_base64_is_decoded(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github.config, "GITHUB_TOKEN", "t")
    import base64
    body = {"content": base64.b64encode("# 标题\n正文".encode()).decode(), "encoding": "base64"}
    monkeypatch.setattr(github, "_client",
                        lambda: httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=body))))
    assert github.get_readme("a/b") == "# 标题\n正文"


def test_search_query_carries_spec_filters(monkeypatch):
    monkeypatch.setattr(github.config, "GITHUB_MOCK", False)
    monkeypatch.setattr(github.config, "GITHUB_TOKEN", "t")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["q"] = request.url.params.get("q")
        return httpx.Response(200, json={"items": []})

    monkeypatch.setattr(github, "_client", lambda: httpx.Client(transport=httpx.MockTransport(handler)))
    github.search_new_repos("Rust")
    assert "language:Rust" in seen["q"]
    assert "fork:false" in seen["q"]
    assert f"stars:>={github.config.CRAWL_MIN_STARS}" in seen["q"]
    assert "created:>=" in seen["q"]
