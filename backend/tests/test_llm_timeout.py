"""OpenAI 客户端必须显式限超时:默认 600s 读超时会让 /api/ai-draft 最坏挂 20 分钟。"""
from app.feed import llm


def test_client_has_explicit_timeout(monkeypatch):
    captured: dict = {}

    class FakeOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(llm, "OpenAI", FakeOpenAI)
    monkeypatch.setattr(llm, "_client", None)
    llm._get_client()
    assert captured["timeout"] == 30.0
    assert captured["max_retries"] == 1
