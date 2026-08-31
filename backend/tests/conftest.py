"""测试公共装置:解读域清 LLM 客户端缓存;信息流域每用例内存库 + 清 GitHub 缓存。"""
import pytest

from app import llm


@pytest.fixture(autouse=True)
def _clear_llm_clients():
    llm._clients.clear()
    yield


@pytest.fixture(autouse=True)
def _clear_github_caches():
    """文件树/文件内容带 lru_cache,用例间必须清,否则降级分支测不到。"""
    from app.feed.routes import repos as feed_repos

    feed_repos._cached_tree.cache_clear()
    feed_repos._cached_file.cache_clear()
    from app.feed import github as feed_github

    feed_github._shared_client = None
    yield


@pytest.fixture()
def conn():
    from app.feed import db

    c = db.connect(":memory:")
    db.init_db(c)
    yield c
    c.close()
