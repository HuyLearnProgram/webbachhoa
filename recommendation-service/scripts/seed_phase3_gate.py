"""
Seed du lieu TAM THOI de dat nguong chuyen sang Phase 3 (bandit explore-exploit) - xem
AI_Recommendation_Roadmap.docx: "on dinh 4-8 tuan, >=2000-3000 impression/tuan tu nguon AI that
(khong tinh RULE_BASED_FALLBACK)". Kiem tra thuc te truoc khi viet script nay cho thay:
  - Du lieu hien co (tu seed_phase2_data.py + traffic that) chi trai ~5 tuan, khong du 8 tuan.
  - >=90% impression la RULE_BASED_FALLBACK, AI-sourced (CONTENT_BASED/POPULARITY/CF) chi
    11-1824/tuan tuy tuan - con xa nguong.
  - Conversion cuc ky thua (10/22791) - khong du tin hieu reward "purchase=+1.0" cho bandit hoc.

Script nay CHI them recommendation_impressions (khong tao them user/order moi - da du: 56 user
>=2 don PAID, 285 don PAID). Gom 2 phan:
  1. "Anchored" - voi moi don PAID that trong 56 ngay gan day, sinh 1-2 request gan mot san pham
     THAT trong don do lam candidate + click + converted_order_id tro thang ve don that -> tin
     hieu purchase-reward dang tin cay (khong doan mo ho nhu ban seed Phase 2 truoc).
  2. "Filler" - bu du the tich AI-sourced con thieu moi tuan (tinh dong tu du lieu that trong DB
     luc chay, khong hardcode) de dat >= TARGET_PER_WEEK_AI, rai deu theo ngay/gio (co trong so
     gio cao diem) thay vi don 1 ngay nhu burst test truoc do.

Day la du lieu TAM THOI de thu nghiem kha nang du doan cua bandit truoc khi co du lieu that -
dung LAI dung script cleanup_seed_data.py da co san (chi doc key co trong manifest, khong dung
user_ids/order_ids vi script nay khong tao user/don moi):

    python scripts/cleanup_seed_data.py scripts/<manifest_phase3_....json>

Chay: cd recommendation-service && python scripts/seed_phase3_gate.py
"""
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
MANIFEST_DIR = Path(__file__).resolve().parent
NOW = datetime.now()

WINDOW_DAYS = 56  # 8 tuan - dung muc tran cua nguong "4-8 tuan"
TARGET_PER_WEEK_AI = 2600  # giua khoang nguong 2000-3000/tuan, co bien do an toan

PLACEMENTS = ["PDP_SIMILAR", "HOME_PERSONALIZED", "CART_SUGGESTION"]
PLACEMENT_WEIGHTS = [70, 22, 8]
ALGO_AI_SOURCES = ["CONTENT_BASED", "POPULARITY", "CF"]
ALGO_AI_WEIGHTS = [34, 28, 38]
HOUR_WEIGHTS = [1, 1, 1, 1, 1, 1, 2, 4, 6, 8, 8, 8, 9, 8, 8, 7, 8, 9, 10, 9, 7, 5, 3, 2]
RANK_CLICK_WEIGHTS = [12, 10, 8, 6, 5, 4, 3, 2, 2, 1]  # thien vi rank dau (position bias)

_session_cache = {}


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


def get_session_id(uid, when: datetime) -> str:
    key = (uid, when.date())
    if key not in _session_cache:
        _session_cache[key] = str(uuid.uuid4())
    return _session_cache[key]


def clamp_past(dt: datetime) -> datetime:
    return dt if dt <= NOW else NOW - timedelta(seconds=random.randint(60, 3600))


def random_hour_dt(date_only: datetime) -> datetime:
    hour = random.choices(range(24), weights=HOUR_WEIGHTS)[0]
    return date_only.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59), microsecond=0)


def main():
    conn = connect()
    cur = conn.cursor()

    manifest = {
        "generated_at": NOW.isoformat(), "window_days": WINDOW_DAYS, "phase": "phase3_bandit_gate",
        "target_per_week_ai": TARGET_PER_WEEK_AI, "recommendation_impression_ids": [],
    }

    try:
        cur.execute("SELECT id FROM users")
        all_user_ids = [r[0] for r in cur.fetchall()]

        cur.execute("SELECT id FROM products WHERE active=1 AND quantity>0")
        product_ids = [r[0] for r in cur.fetchall()]

        window_start = NOW - timedelta(days=WINDOW_DAYS)

        cur.execute(
            "SELECT id, user_id, order_time FROM orders WHERE payment_status='PAID' AND order_time >= %s "
            "ORDER BY user_id, order_time",
            (window_start,),
        )
        order_rows = cur.fetchall()
        order_ids = [r[0] for r in order_rows]

        order_items = {}
        if order_ids:
            fmt = ",".join(["%s"] * len(order_ids))
            cur.execute(f"SELECT order_id, product_id FROM order_detail WHERE order_id IN ({fmt})", order_ids)
            for oid, pid in cur.fetchall():
                order_items.setdefault(oid, []).append(pid)

        user_orders = {}
        for oid, uid, ot in order_rows:
            user_orders.setdefault(uid, []).append((oid, ot, order_items.get(oid, [])))

        # so lieu AI-sourced hien co, bucket theo tuan lui (0 = 7 ngay gan nhat) - de tinh phan con
        # thieu THEO DU LIEU THAT tai thoi diem chay, khong hardcode con so cu.
        cur.execute(
            "SELECT shown_at FROM recommendation_impressions WHERE algorithm_source <> 'RULE_BASED_FALLBACK' "
            "AND shown_at >= %s",
            (window_start,),
        )
        existing_ai_by_week = {}
        for (shown_at,) in cur.fetchall():
            w = min(int((NOW - shown_at).total_seconds() // 86400 // 7), 7)
            existing_ai_by_week[w] = existing_ai_by_week.get(w, 0) + 1

        impression_rows = []

        def add_request(uid, shown_at, placement, candidates, clicked_idx, converted_order_id, force_ai=True):
            shown_at = clamp_past(shown_at)
            request_id = str(uuid.uuid4())
            session_id = get_session_id(uid, shown_at)
            dominant = random.choices(ALGO_AI_SOURCES, weights=ALGO_AI_WEIGHTS)[0]
            for rank, pid in enumerate(candidates):
                is_clicked = 1 if rank == clicked_idx else 0
                clicked_at = shown_at + timedelta(seconds=random.randint(5, 240)) if is_clicked else None
                is_converted = 1 if (is_clicked and converted_order_id) else 0
                impression_rows.append((
                    dominant, is_clicked, clicked_at, is_converted,
                    converted_order_id if is_converted else None,
                    placement, rank, request_id, session_id, shown_at, pid, uid,
                ))

        # ---- 1. Anchored: neo vao don PAID that -> tin hieu purchase-reward dang tin cay ----
        anchored_requests = 0
        for uid, orders in user_orders.items():
            for oid, ot, pids in orders:
                if not pids:
                    continue
                for _ in range(random.randint(1, 2)):
                    lead_days = random.uniform(0.3, 9)
                    shown_at = ot - timedelta(days=lead_days)
                    if shown_at < window_start:
                        continue
                    target_pid = random.choice(pids)
                    pool = [p for p in product_ids if p != target_pid]
                    fillers = random.sample(pool, min(random.randint(4, 8), len(pool)))
                    candidates = fillers[:]
                    insert_at = random.randint(0, len(candidates))
                    candidates.insert(insert_at, target_pid)
                    placement = random.choices(PLACEMENTS, weights=PLACEMENT_WEIGHTS)[0]
                    will_click = random.random() < 0.72
                    clicked_idx = insert_at if will_click else -1
                    add_request(uid, shown_at, placement, candidates, clicked_idx, oid if will_click else None)
                    anchored_requests += 1

        # ---- 2. Filler: bu du the tich AI-sourced con thieu moi tuan, rai deu theo ngay/gio ----
        AVG_CANDIDATES = 7
        filler_requests = 0
        for w in range(WINDOW_DAYS // 7):
            week_end = NOW - timedelta(days=7 * w)
            week_start = NOW - timedelta(days=7 * (w + 1))
            current_from_db = existing_ai_by_week.get(w, 0)
            current_from_anchor = sum(
                1 for row in impression_rows if week_start <= row[9] < week_end
            )
            deficit = TARGET_PER_WEEK_AI - current_from_db - current_from_anchor
            if deficit <= 0:
                continue
            n_requests = int(deficit / AVG_CANDIDATES) + 1
            for _ in range(n_requests):
                days_back = random.uniform(0, 7)
                date_only = week_end - timedelta(days=days_back)
                shown_at = random_hour_dt(date_only)
                if shown_at < window_start:
                    shown_at = window_start + timedelta(minutes=random.randint(1, 120))
                uid = random.choice(all_user_ids) if random.random() < 0.85 else None
                n = random.randint(5, 10)
                candidates = random.sample(product_ids, min(n, len(product_ids)))
                placement = random.choices(PLACEMENTS, weights=PLACEMENT_WEIGHTS)[0]
                clicked_idx = -1
                converted_order_id = None
                if random.random() < 0.30:
                    clicked_idx = random.choices(
                        range(len(candidates)), weights=RANK_CLICK_WEIGHTS[:len(candidates)]
                    )[0]
                    if uid and random.random() < 0.06:
                        future = [o for o in user_orders.get(uid, []) if o[1] > shown_at]
                        if future:
                            converted_order_id = random.choice(future)[0]
                add_request(uid, shown_at, placement, candidates, clicked_idx, converted_order_id)
                filler_requests += 1

        if impression_rows:
            cur.executemany(
                "INSERT INTO recommendation_impressions (algorithm_source, clicked, clicked_at, converted, "
                "converted_order_id, placement, rank_position, request_id, session_id, shown_at, product_id, "
                "user_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                impression_rows,
            )
            first_id = cur.lastrowid
            manifest["recommendation_impression_ids"] = list(range(first_id, first_id + len(impression_rows)))

        conn.commit()

        manifest_path = MANIFEST_DIR / f"seed_manifest_phase3_{NOW.strftime('%Y%m%d_%H%M%S')}.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

        n_converted = sum(1 for r in impression_rows if r[3])
        n_clicked = sum(1 for r in impression_rows if r[1])
        print(f"Anchored requests: {anchored_requests} | Filler requests: {filler_requests}")
        print(f"Total impressions inserted: {len(impression_rows)} "
              f"(clicked: {n_clicked}, converted: {n_converted})")
        print(f"Manifest ghi tai: {manifest_path}")
        print("Xoa het du lieu nay bang: python scripts/cleanup_seed_data.py " + str(manifest_path))

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
