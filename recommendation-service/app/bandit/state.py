"""Persist trạng thái bandit qua SQLite file local (Phase 3).

Vì sao SQLite mà không phải MySQL: giữ bất biến "Python chỉ SELECT MySQL — mọi ghi đi qua
Java" (xem app/db.py). Trạng thái bandit (ma trận A/b mỗi arm + decision log chờ reward)
là dữ liệu vận hành nội bộ của service, mất đi chỉ khiến bandit học lại từ đầu, không mất
dữ liệu nghiệp vụ. SQLite transactional + WAL an toàn hơn JSON khi 2 luồng (serve ghi
decision, poller update arms) cùng ghi.

Mọi lỗi đọc/ghi đều được nuốt + log — bandit hỏng không bao giờ được phép phá request gợi ý.
"""

import logging
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

_ARMS_SQL = """
CREATE TABLE IF NOT EXISTS arms (
    category_id INTEGER PRIMARY KEY,
    a BLOB NOT NULL,
    b BLOB NOT NULL,
    n_updates INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
)
"""
_DECISIONS_SQL = """
CREATE TABLE IF NOT EXISTS decisions (
    request_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    context BLOB NOT NULL,
    created_at TEXT NOT NULL,
    click_rewarded INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (request_id, product_id)
)
"""


def _utcnow() -> datetime:
    # naive-UTC nhất quán với fatigue.py/main.py (shown_at MySQL lưu UTC không timezone)
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BanditState:
    def __init__(self, path: str) -> None:
        self._lock = threading.Lock()
        self._conn: sqlite3.Connection | None = None
        try:
            file = Path(path)
            file.parent.mkdir(parents=True, exist_ok=True)
            self._conn = sqlite3.connect(str(file), check_same_thread=False)
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute(_ARMS_SQL)
            self._conn.execute(_DECISIONS_SQL)
            self._conn.commit()
        except Exception:
            logger.exception("Không mở được bandit state %s — bandit chạy in-memory kỳ này.", path)
            self._conn = None

    # ---- arms ----

    def load_arms(self, dim: int) -> dict[int, tuple[np.ndarray, np.ndarray, int]]:
        """{category_id: (A (dim×dim), b (dim,), n_updates)} — bỏ qua dòng sai shape (đổi dim)."""
        if self._conn is None:
            return {}
        arms: dict[int, tuple[np.ndarray, np.ndarray, int]] = {}
        try:
            with self._lock:
                rows = self._conn.execute("SELECT category_id, a, b, n_updates FROM arms").fetchall()
            for cat, a_blob, b_blob, n in rows:
                a = np.frombuffer(a_blob, dtype=np.float64)
                b = np.frombuffer(b_blob, dtype=np.float64)
                if a.size == dim * dim and b.size == dim:
                    arms[int(cat)] = (a.reshape(dim, dim).copy(), b.copy(), int(n))
        except Exception:
            logger.exception("Đọc arms lỗi — bandit khởi động rỗng.")
        return arms

    def save_arm(self, category_id: int, a: np.ndarray, b: np.ndarray, n_updates: int) -> None:
        if self._conn is None:
            return
        try:
            with self._lock:
                self._conn.execute(
                    "INSERT INTO arms (category_id, a, b, n_updates, updated_at) VALUES (?,?,?,?,?) "
                    "ON CONFLICT(category_id) DO UPDATE SET a=excluded.a, b=excluded.b, "
                    "n_updates=excluded.n_updates, updated_at=excluded.updated_at",
                    (category_id, a.astype(np.float64).tobytes(), b.astype(np.float64).tobytes(),
                     n_updates, _utcnow().isoformat()),
                )
                self._conn.commit()
        except Exception:
            logger.exception("Ghi arm %s lỗi — bỏ qua (mất 1 update, không chết request).", category_id)

    def count_arms(self) -> int:
        if self._conn is None:
            return 0
        try:
            with self._lock:
                return self._conn.execute("SELECT COUNT(*) FROM arms").fetchone()[0]
        except Exception:
            return 0

    # ---- decisions ----

    def add_decision(self, request_id: str, product_id: int, category_id: int, context: np.ndarray) -> None:
        if self._conn is None:
            return
        try:
            with self._lock:
                self._conn.execute(
                    "INSERT OR IGNORE INTO decisions (request_id, product_id, category_id, context, created_at) "
                    "VALUES (?,?,?,?,?)",
                    (request_id, product_id, category_id,
                     context.astype(np.float64).tobytes(), _utcnow().isoformat()),
                )
                self._conn.commit()
        except Exception:
            logger.exception("Ghi decision lỗi — slot explore này sẽ không được học.")

    def pending_decisions(self) -> list[dict]:
        """[{request_id, product_id, category_id, context(np), created_at(datetime), click_rewarded}]"""
        if self._conn is None:
            return []
        try:
            with self._lock:
                rows = self._conn.execute(
                    "SELECT request_id, product_id, category_id, context, created_at, click_rewarded "
                    "FROM decisions WHERE status = 'PENDING'"
                ).fetchall()
            return [
                {
                    "request_id": r[0],
                    "product_id": int(r[1]),
                    "category_id": int(r[2]),
                    "context": np.frombuffer(r[3], dtype=np.float64),
                    "created_at": datetime.fromisoformat(r[4]),
                    "click_rewarded": bool(r[5]),
                }
                for r in rows
            ]
        except Exception:
            logger.exception("Đọc pending decisions lỗi.")
            return []

    def count_pending(self) -> int:
        if self._conn is None:
            return 0
        try:
            with self._lock:
                return self._conn.execute(
                    "SELECT COUNT(*) FROM decisions WHERE status = 'PENDING'"
                ).fetchone()[0]
        except Exception:
            return 0

    def mark_click_rewarded(self, request_id: str, product_id: int) -> None:
        self._exec("UPDATE decisions SET click_rewarded = 1 WHERE request_id = ? AND product_id = ?",
                   (request_id, product_id))

    def finalize(self, request_id: str, product_id: int) -> None:
        self._exec("UPDATE decisions SET status = 'FINAL' WHERE request_id = ? AND product_id = ?",
                   (request_id, product_id))

    def delete(self, request_id: str, product_id: int) -> None:
        self._exec("DELETE FROM decisions WHERE request_id = ? AND product_id = ?",
                   (request_id, product_id))

    def purge_older_than(self, days: float) -> int:
        """Finalize decision PENDING quá TTL (không thưởng nữa) + xoá hẳn dòng FINAL cũ."""
        if self._conn is None:
            return 0
        try:
            cutoff = (_utcnow() - timedelta(days=days)).isoformat()
            with self._lock:
                cur = self._conn.execute(
                    "UPDATE decisions SET status = 'FINAL' WHERE status = 'PENDING' AND created_at < ?",
                    (cutoff,),
                )
                self._conn.execute("DELETE FROM decisions WHERE status = 'FINAL' AND created_at < ?",
                                   (cutoff,))
                self._conn.commit()
                return cur.rowcount
        except Exception:
            logger.exception("Purge decisions lỗi.")
            return 0

    def _exec(self, sql: str, params: tuple) -> None:
        if self._conn is None:
            return
        try:
            with self._lock:
                self._conn.execute(sql, params)
                self._conn.commit()
        except Exception:
            logger.exception("Bandit state exec lỗi: %s", sql)


state = BanditState(settings.bandit_state_path)
