"""/api/repos/root:mock 模式端到端(不触 GitHub、不调真实 LLM)。"""
import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _mock_llm(monkeypatch):
    monkeypatch.setattr(config, "LLM_MOCK", True)


def _make_session() -> str:
    resp = client.post("/api/sessions")
    assert resp.status_code == 200
    return resp.json()["session_id"]


def test_repo_root_returns_root_children_edges():
    session_id = _make_session()
    resp = client.post(
        "/api/repos/root",
        json={"session_id": session_id, "full_name": "octocat/demo"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["node"]["title"] == "octocat/demo 仓库的解读"
    assert len(body["children"]) >= 1
    assert len(body["edges"]) == len(body["children"])
    for edge in body["edges"]:
        assert edge["parent_id"] == body["node"]["id"]


def test_repo_root_requires_session():
    resp = client.post("/api/repos/root", json={"session_id": "nope", "full_name": "octocat/demo"})
    assert resp.status_code == 404


def test_repo_context_feeds_expand_in_same_session():
    session_id = _make_session()
    root = client.post(
        "/api/repos/root", json={"session_id": session_id, "full_name": "octocat/demo"}
    ).json()
    parent = root["children"][0]
    resp = client.post(
        "/api/expand",
        json={
            "session_id": session_id,
            "node_id": parent["id"],
            "node_title": parent["title"],
            "path": [root["node"]["title"], parent["title"]],
            "depth": 1,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["refused"] is None
