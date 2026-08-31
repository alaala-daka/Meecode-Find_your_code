"""排序公式与预留位填充。保底曝光承诺全靠这两件事，用例覆盖边界。"""
import math

from app import config
from app.feed import ranking

HOUR = 3600
NOW = 1_700_000_000


def repo(**kw) -> dict:
    base = {
        "source": "crawled", "published_at": NOW, "quality": 3,
        "impression_count": 0, "repo_view_count": 0,
    }
    return {**base, **kw}


def test_freshness_decays_by_halflife():
    assert ranking.freshness(NOW, NOW) == 1.0
    half = ranking.freshness(NOW - int(config.FRESHNESS_HALFLIFE_HOURS * HOUR), NOW)
    assert math.isclose(half, 0.5, abs_tol=1e-6)


def test_freshness_never_negative_for_future_timestamps():
    # 时钟偏差导致 published_at 略超 now，不能算出 >1 或负数
    assert 0 < ranking.freshness(NOW + 10 * HOUR, NOW) <= 1.0


def test_ctr_zero_impressions_is_zero_not_division_error():
    assert ranking.ctr(0, 0) == 0.0
    assert ranking.ctr(5, 0) == 0.0  # 计数错序也不炸


def test_ctr_is_views_over_impressions():
    assert ranking.ctr(3, 12) == 0.25


def test_ctr_clamped_to_one():
    # 同一用户重复打开会让 view 超过 impression，夹到 1 以免刷分
    assert ranking.ctr(30, 10) == 1.0


def test_debut_boost_applies_to_submitted_within_window():
    assert ranking.debut_boost("submitted", NOW - HOUR, NOW) == config.DEBUT_BOOST


def test_debut_boost_expires_after_window():
    old = NOW - (config.DEBUT_WINDOW_HOURS + 1) * HOUR
    assert ranking.debut_boost("submitted", old, NOW) == 1.0


def test_debut_boost_never_applies_to_crawled():
    assert ranking.debut_boost("crawled", NOW - HOUR, NOW) == 1.0


def test_quality_raises_score_within_debut_window():
    lo = ranking.score(repo(source="submitted", quality=1), NOW)
    hi = ranking.score(repo(source="submitted", quality=5), NOW)
    assert hi > lo  # 优质投稿排更前


def test_reserved_slots_is_ceil_of_ratio():
    assert ranking.reserved_slots(24) == 10   # ceil(24*0.4)
    assert ranking.reserved_slots(1) == 1
    assert ranking.reserved_slots(0) == 0


def test_assemble_feed_reserves_slots_for_submitted():
    sub = [f"s{i}" for i in range(20)]
    cra = [f"c{i}" for i in range(20)]
    out = ranking.assemble_feed(sub, cra, page_size=10)
    assert len(out) == 10
    assert sum(1 for x in out if x.startswith("s")) >= ranking.reserved_slots(10)


def test_assemble_feed_takes_highest_scored_submitted_first():
    # 传入已按 score 降序，预留位必须从头取，不能跳过高分
    out = ranking.assemble_feed(["s0", "s1", "s2"], [f"c{i}" for i in range(10)], page_size=10)
    assert "s0" in out and "s1" in out and "s2" in out


def test_assemble_feed_falls_back_when_submitted_short():
    # 投稿不足：预留位回落给采集，不留空位
    out = ranking.assemble_feed(["s0"], [f"c{i}" for i in range(20)], page_size=10)
    assert len(out) == 10
    assert out.count("s0") == 1


def test_assemble_feed_no_duplicates():
    out = ranking.assemble_feed([f"s{i}" for i in range(5)], [f"c{i}" for i in range(5)], page_size=10)
    assert len(out) == len(set(out)) == 10


def test_assemble_feed_handles_both_empty():
    assert ranking.assemble_feed([], [], page_size=10) == []


def test_assemble_feed_submitted_only_fills_page():
    out = ranking.assemble_feed([f"s{i}" for i in range(20)], [], page_size=10)
    assert len(out) == 10


def test_interleave_consumes_everything_exactly_once():
    sub = [f"s{i}" for i in range(7)]
    cra = [f"c{i}" for i in range(13)]
    out = ranking.interleave(sub, cra, page_size=5)
    assert sorted(out) == sorted(sub + cra)      # 无遗漏
    assert len(out) == len(set(out)) == 20       # 无重复


def test_interleave_every_block_meets_reserved_ratio():
    sub = [f"s{i}" for i in range(20)]
    cra = [f"c{i}" for i in range(20)]
    out = ranking.interleave(sub, cra, page_size=10)
    want = ranking.reserved_slots(10)
    for start in (0, 10):  # 第一页与第二页都要给投稿留位
        block = out[start:start + 10]
        assert sum(1 for x in block if x.startswith("s")) >= want


def test_interleave_preserves_relative_order_within_each_side():
    sub = [f"s{i}" for i in range(6)]
    cra = [f"c{i}" for i in range(6)]
    out = ranking.interleave(sub, cra, page_size=4)
    assert [x for x in out if x.startswith("s")] == sub  # 高分投稿不被后置
    assert [x for x in out if x.startswith("c")] == cra


def test_interleave_one_side_empty():
    assert ranking.interleave([], ["c0", "c1"], page_size=3) == ["c0", "c1"]
    assert ranking.interleave(["s0"], [], page_size=3) == ["s0"]
    assert ranking.interleave([], [], page_size=3) == []


def test_interleave_assemble_feed_agree_on_first_page():
    sub = [f"s{i}" for i in range(9)]
    cra = [f"c{i}" for i in range(9)]
    assert ranking.interleave(sub, cra, 5)[:5] == ranking.assemble_feed(sub, cra, 5)
