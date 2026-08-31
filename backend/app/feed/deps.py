"""FastAPI 依赖：数据库连接。测试用 dependency_overrides 换成内存库。"""
from __future__ import annotations

import sqlite3
from typing import Iterator

from . import db

_conn: sqlite3.Connection | None = None


def get_conn() -> Iterator[sqlite3.Connection]:
    """进程内单连接：SQLite + WAL 足够 MVP 用量，扛不住再换连接池。"""
    global _conn
    if _conn is None:
        _conn = db.connect()
        db.init_db(_conn)
    yield _conn
