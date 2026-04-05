from __future__ import annotations

import sqlite3
from pathlib import Path

from infra.settings import settings


def get_conn() -> sqlite3.Connection:
    db_file = Path(settings.db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    migration = Path(__file__).resolve().parents[2] / "migrations" / "001_init.sql"
    sql = migration.read_text(encoding="utf-8")
    conn.executescript(sql)
    conn.commit()
