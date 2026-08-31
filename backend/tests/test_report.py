"""保底曝光达标率：投稿 vs 同窗口采集的曝光中位数比较。"""
from app import config
from app.feed.jobs import report

NOW = 1_700_000_000
HOUR = 3600


def add(conn, gid, *, source, impressions, hours_ago=1, status="published"):
    conn.execute(
        "INSERT INTO repos (github_id, full_name, owner_login, source, status,"
        " quality, published_at, impression_count)"
        " VALUES (?,?,?,?,?,3,?,?)",
        (gid, f"d{gid}/p{gid}", f"d{gid}", source, status,
         NOW - hours_ago * HOUR, impressions))
    conn.commit()


def test_median_odd_and_even():
    assert report.median([3, 1, 2]) == 2
    assert report.median([1, 2, 3, 4]) == 2.5


def test_median_empty_is_zero():
    assert report.median([]) == 0.0


def test_all_submissions_meeting_gives_ratio_one(conn):
    for i in range(3):
        add(conn, i, source="crawled", impressions=100)
    for i in range(2):
        add(conn, 10 + i, source="submitted", impressions=150)
    out = report.guarantee_report(conn, now=NOW)
    assert out["median_crawled"] == 100
    assert out["window_submitted"] == 2
    assert out["ratio"] == 1.0
    assert out["suggest_raise"] is False


def test_half_meeting_flags_raise(conn):
    for i in range(3):
        add(conn, i, source="crawled", impressions=100)
    add(conn, 10, source="submitted", impressions=150)
    add(conn, 11, source="submitted", impressions=150)
    add(conn, 12, source="submitted", impressions=10)
    add(conn, 13, source="submitted", impressions=10)
    add(conn, 14, source="submitted", impressions=10)
    out = report.guarantee_report(conn, now=NOW)
    assert out["meeting"] == 2 and out["window_submitted"] == 5
    assert out["ratio"] == 0.4
    assert out["suggest_raise"] is True  # < 50%


def test_only_compares_same_window(conn):
    """老采集仓库的累计曝光不该抬高中位数（spec 落地决定 2）。"""
    add(conn, 1, source="crawled", impressions=99999, hours_ago=1000)  # 窗口外
    add(conn, 2, source="crawled", impressions=50)
    add(conn, 10, source="submitted", impressions=60)
    out = report.guarantee_report(conn, now=NOW)
    assert out["median_crawled"] == 50
    assert out["ratio"] == 1.0


def test_excludes_delisted(conn):
    add(conn, 1, source="crawled", impressions=100)
    add(conn, 10, source="submitted", impressions=10, status="delisted")
    out = report.guarantee_report(conn, now=NOW)
    assert out["window_submitted"] == 0


def test_no_submissions_is_not_a_failure(conn):
    add(conn, 1, source="crawled", impressions=100)
    out = report.guarantee_report(conn, now=NOW)
    assert out["window_submitted"] == 0
    assert out["ratio"] == 1.0 and out["suggest_raise"] is False


def test_no_crawled_baseline_means_everything_meets(conn):
    add(conn, 10, source="submitted", impressions=0)
    out = report.guarantee_report(conn, now=NOW)
    assert out["median_crawled"] == 0.0 and out["ratio"] == 1.0
