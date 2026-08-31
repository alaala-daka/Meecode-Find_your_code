"""FastAPI 依赖:每请求一个 SQLite 连接。

进程级单连接会让并发请求共享同一事务:请求 A 的 commit 会把请求 B 的半成品写
一起提交,读侧也可能看到未提交数据。WAL 下建连廉价,每请求连接彻底消除事务交叉。
"""
from __future__ import annotations

import sqlite3
from collections.abc import Iterator

from . import db


def get_conn() -> Iterator[sqlite3.Connection]:
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()
