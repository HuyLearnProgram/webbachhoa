"""
Xoa sach du lieu tam da tao boi seed_phase2_data.py, dung dung ID ghi trong file manifest JSON
(khong doan theo email/ten vi du lieu duoc sinh "giong that" nen khong co marker de loc theo noi dung).

Chay: cd recommendation-service && python scripts/cleanup_seed_data.py scripts/seed_manifest_<timestamp>.json
"""
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def load_db_url() -> str:
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith("DB_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("DB_URL not found in .env")


def connect():
    url = urlparse(load_db_url().replace("mysql+pymysql", "mysql"))
    return pymysql.connect(
        host=url.hostname, port=url.port or 3306, user=url.username,
        password=url.password, database=url.path.lstrip("/"), charset="utf8mb4", autocommit=False,
    )


def in_clause(ids) -> str:
    return ",".join(str(i) for i in ids) if ids else "-1"


def main(manifest_path: str):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    conn = connect()
    cur = conn.cursor()
    try:
        # Xoa theo thu tu an toan FK: bang tham chieu orders/users truoc, roi moi den orders/users.
        for table, key in [
            ("recommendation_impressions", "recommendation_impression_ids"),
            ("product_views", "product_view_ids"),
            ("search_logs", "search_log_ids"),
            ("cart_events", "cart_event_ids"),
        ]:
            ids = manifest.get(key, [])
            if ids:
                cur.execute(f"DELETE FROM {table} WHERE id IN ({in_clause(ids)})")

        order_ids = manifest.get("order_ids", [])
        if order_ids:
            cur.execute(f"DELETE FROM order_detail WHERE order_id IN ({in_clause(order_ids)})")
            cur.execute(f"DELETE FROM orders WHERE id IN ({in_clause(order_ids)})")

        user_ids = manifest.get("user_ids", [])
        if user_ids:
            cur.execute(f"DELETE FROM users WHERE id IN ({in_clause(user_ids)})")

        conn.commit()
        print(f"Da xoa: {len(user_ids)} user, {len(order_ids)} don hang va cac dong event tuong ung.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python cleanup_seed_data.py <duong_dan_manifest.json>")
        sys.exit(1)
    main(sys.argv[1])
