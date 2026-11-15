import sqlite3
import logging

log = logging.getLogger(__name__)
DB_PATH = "svc.db"


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_one(conn, sql, params=()):
    log.debug("fetch_one %s", sql)
    return conn.execute(sql, params).fetchone()


def fetch_all(conn, sql, params=()):
    log.debug("fetch_all %s", sql)
    return conn.execute(sql, params).fetchall()
