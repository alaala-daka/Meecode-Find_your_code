"""测试公共装置:每个用例前清空 LLM 客户端缓存。"""
import pytest

from app import llm


@pytest.fixture(autouse=True)
def _clear_llm_clients():
    llm._clients.clear()
    yield
