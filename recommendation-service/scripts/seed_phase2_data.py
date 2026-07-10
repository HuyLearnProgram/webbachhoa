"""
Seed dữ liệu tạm để đạt ngưỡng dữ liệu Phase 2 (xem AI_Recommendation_Roadmap.docx, mục 5):
  - ~200-300 don PAID
  - ~50 user co >=2 don PAID khac nhau
  - lien tuc 4-8 tuan du lieu view/impression

Toan bo gia tri field (ten, dia chi, thoi gian don hang, hanh vi xem/tim kiem/gio hang...) duoc
sinh ngau nhien nhung hop le (dung enum, dung FK, thu tu thoi gian hop ly) de "giong du lieu that".

Day la du lieu TAM THOI - script ghi lai toan bo ID vua insert vao 1 file manifest JSON, dung
cleanup_seed_data.py de xoa dung nhung dong nay (khong doan theo email/ten) khi da co du du lieu that.

Chay: cd recommendation-service && python scripts/seed_phase2_data.py
"""
import json
import random
import unicodedata
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import pymysql

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
MANIFEST_DIR = Path(__file__).resolve().parent
NOW = datetime.now()

WINDOW_DAYS = 28  # ~4 tuan
NEW_USER_COUNT = 40  # 16 user hien co (>=2 don) + 40 moi = 56, vuot moc ~50

SURNAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương", "Lý"]
MIDDLE_MALE = ["Văn", "Hữu", "Đức", "Minh", "Quốc", "Công", "Thành"]
MIDDLE_FEMALE = ["Thị", "Ngọc", "Thu", "Kim", "Diệu", "Mỹ"]
GIVEN_MALE = ["Nam", "Hùng", "Dũng", "Long", "Khang", "Phúc", "Bảo", "Tuấn", "Đạt", "Sơn", "Kiên", "An", "Huy", "Việt", "Quân"]
GIVEN_FEMALE = ["Hoa", "Lan", "Trang", "Ngọc", "Hương", "Linh", "Nhi", "Anh", "Thảo", "Mai", "Vy", "Chi", "Yến", "Hà"]

STREETS = ["Lê Lợi", "Nguyễn Huệ", "Trần Hưng Đạo", "Hai Bà Trưng", "Điện Biên Phủ", "Cách Mạng Tháng 8",
           "Nguyễn Văn Cừ", "Lý Thường Kiệt", "Phan Đình Phùng", "Nguyễn Thị Minh Khai"]
WARDS = ["Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận Bình Thạnh", "Quận Tân Bình", "TP. Thủ Đức"]
CITIES = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Bình Dương"]
EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com"]

SOURCES = ["HOME_FEED", "SEARCH_RESULT", "CATEGORY_PAGE", "SIMILAR", "DIRECT"]
SOURCE_WEIGHTS = [30, 20, 20, 10, 20]
PLACEMENTS = ["HOME_PERSONALIZED", "PDP_SIMILAR", "CART_SUGGESTION"]
ALGO_SOURCES = ["CONTENT_BASED", "POPULARITY", "RULE_BASED_FALLBACK"]
HOUR_WEIGHTS = [1, 1, 1, 1, 1, 1, 2, 4, 6, 8, 8, 8, 9, 8, 8, 7, 8, 9, 10, 9, 7, 5, 3, 2]


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


def strip_diacritics(text: str) -> str:
    norm = unicodedata.normalize("NFD", text)
    no_marks = "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")
    return no_marks.replace("đ", "d").replace("Đ", "D")


def gen_name():
    is_male = random.random() < 0.5
    surname = random.choice(SURNAMES)
    middle = random.choice(MIDDLE_MALE if is_male else MIDDLE_FEMALE)
    given = random.choice(GIVEN_MALE if is_male else GIVEN_FEMALE)
    return f"{surname} {middle} {given}"


def gen_email(name: str, idx: int) -> str:
    ascii_name = strip_diacritics(name).lower().replace(" ", "")
    return f"{ascii_name}{idx}{random.randint(10, 99)}@{random.choice(EMAIL_DOMAINS)}"


def gen_phone() -> str:
    prefix = random.choice(["03", "05", "07", "08", "09"])
    return prefix + "".join(str(random.randint(0, 9)) for _ in range(8))


def gen_address() -> str:
    return f"{random.randint(1, 300)} Đường {random.choice(STREETS)}, {random.choice(WARDS)}, {random.choice(CITIES)}"


def random_time_in_window(days_back_max=WINDOW_DAYS, days_back_min=0.0):
    days_ago = random.uniform(days_back_min, days_back_max)
    hour = random.choices(range(24), weights=HOUR_WEIGHTS)[0]
    base = NOW - timedelta(days=days_ago)
    return base.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59),
                         microsecond=random.randint(0, 999999))


def clamp_past(dt: datetime) -> datetime:
    return dt if dt <= NOW else NOW - timedelta(seconds=random.randint(60, 3600))


def gen_keyword(product_name: str) -> str:
    words = product_name.split()
    n = random.randint(1, min(3, len(words)))
    start = random.randint(0, len(words) - n)
    return " ".join(words[start:start + n]).lower()


def main():
    conn = connect()
    cur = conn.cursor()

    manifest = {
        "generated_at": NOW.isoformat(), "window_days": WINDOW_DAYS,
        "user_ids": [], "order_ids": [], "product_view_ids": [],
        "search_log_ids": [], "cart_event_ids": [], "recommendation_impression_ids": [],
    }

    try:
        cur.execute("SELECT password FROM users LIMIT 1")
        fallback_password_hash = cur.fetchone()[0]

        cur.execute("SELECT id, product_name, price FROM products WHERE active=1 AND quantity>0")
        products = cur.fetchall()
        product_ids = [p[0] for p in products]
        product_name = {p[0]: p[1] for p in products}
        product_price = {p[0]: p[2] for p in products}

        # ---- 1. Users ----
        user_rows = []
        for i in range(NEW_USER_COUNT):
            name = gen_name()
            user_rows.append((
                gen_address(), None, gen_email(name, i), name, fallback_password_hash,
                gen_phone(), None, 1, 1, None, None,
            ))
        cur.executemany(
            "INSERT INTO users (address, avatar_url, email, name, password, phone, refresh_token, "
            "status, role_id, provider, provider_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            user_rows,
        )
        first_user_id = cur.lastrowid
        user_ids = list(range(first_user_id, first_user_id + NEW_USER_COUNT))
        manifest["user_ids"] = user_ids

        cur.execute(f"SELECT id, address, phone FROM users WHERE id IN ({','.join(map(str, user_ids))})")
        user_info = {r[0]: {"address": r[1], "phone": r[2]} for r in cur.fetchall()}

        # ---- 2. Order plans (tinh truoc items/total de insert orders 1 lan voi total_price dung) ----
        order_plans = []
        for uid in user_ids:
            n_orders = random.choices([2, 3, 4], weights=[50, 35, 15])[0]
            order_times = sorted(random_time_in_window() for _ in range(n_orders))
            for ot in order_times:
                n_items = random.randint(1, 5)
                chosen = random.sample(product_ids, min(n_items, len(product_ids)))
                items = []
                total = 0.0
                for pid in chosen:
                    qty = random.randint(1, 3)
                    price = product_price[pid] or 0.0
                    line_total = round(price * qty, 2)
                    items.append((pid, qty, price, line_total))
                    total += line_total
                payment_method = random.choices(["COD", "VNPAY"], weights=[60, 40])[0]
                status = random.choices([2, 4], weights=[90, 10])[0]
                delivery = clamp_past(ot + timedelta(days=random.randint(1, 4)))
                paid_at = clamp_past(ot + timedelta(minutes=random.randint(1, 90)))
                txn_no = "".join(str(random.randint(0, 9)) for _ in range(14)) if payment_method == "VNPAY" else None
                order_plans.append({
                    "user_id": uid, "order_time": ot, "delivery": delivery, "paid_at": paid_at,
                    "payment_method": payment_method, "status": status, "txn_no": txn_no,
                    "items": items, "total": round(total, 2),
                })

        order_rows = [(
            user_info[p["user_id"]]["address"], p["delivery"], p["order_time"], p["payment_method"],
            p["status"], p["total"], p["user_id"], user_info[p["user_id"]]["phone"], None,
            p["paid_at"], "PAID", p["txn_no"], p["txn_no"],
        ) for p in order_plans]

        cur.executemany(
            "INSERT INTO orders (address, delivery_time, order_time, payment_method, status, total_price, "
            "user_id, phone, voucher_id, paid_at, payment_status, transaction_no, vnp_txn_ref) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            order_rows,
        )
        first_order_id = cur.lastrowid
        order_ids = list(range(first_order_id, first_order_id + len(order_rows)))
        manifest["order_ids"] = order_ids

        # ---- 3. order_detail ----
        detail_rows = []
        for oid, plan in zip(order_ids, order_plans):
            for pid, qty, price, line_total in plan["items"]:
                detail_rows.append((qty, price, oid, pid, 0, line_total, "NONE", None, None, None))
        cur.executemany(
            "INSERT INTO order_detail (quantity, unit_price, order_id, product_id, free_units, line_total, "
            "promotion_type, original_price, promo_bundle_price, promo_bundle_quantity) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            detail_rows,
        )

        user_orders = {}
        for oid, plan in zip(order_ids, order_plans):
            user_orders.setdefault(plan["user_id"], []).append((oid, plan["order_time"], plan["items"]))

        # ---- 4. Event tracking: product_views / cart_events / search_logs / recommendation_impressions ----
        view_rows, cart_rows, search_rows, impression_rows = [], [], [], []

        for uid in user_ids:
            session_id = str(uuid.uuid4())
            my_orders = user_orders.get(uid, [])

            for oid, ot, items in my_orders:
                item_pids = [it[0] for it in items]
                for pid, qty, price, line_total in items:
                    view_time = clamp_past(ot - timedelta(minutes=random.randint(5, 360)))
                    referrer = random.choice(item_pids) if random.random() < 0.2 else None
                    view_rows.append((referrer, session_id, random.choices(SOURCES, weights=SOURCE_WEIGHTS)[0],
                                       view_time, pid, uid))
                    if random.random() < 0.6:
                        cart_rows.append(("ADD", clamp_past(view_time + timedelta(minutes=random.randint(1, 30))),
                                           qty, session_id, pid, uid))

            for _ in range(random.randint(3, 10)):
                pid = random.choice(product_ids)
                view_rows.append((None, session_id, random.choices(SOURCES, weights=SOURCE_WEIGHTS)[0],
                                   random_time_in_window(), pid, uid))

            for _ in range(random.randint(1, 4)):
                pid = random.choice(product_ids)
                keyword = gen_keyword(product_name[pid])
                search_rows.append((
                    pid if random.random() < 0.5 else None, keyword, strip_diacritics(keyword).lower(),
                    random.randint(0, 25), random_time_in_window(), session_id, uid,
                ))

            for _ in range(random.randint(2, 5)):
                request_id = str(uuid.uuid4())
                shown_at = random_time_in_window()
                placement = random.choice(PLACEMENTS)
                candidates = random.sample(product_ids, min(random.randint(4, 10), len(product_ids)))
                clicked_idx = random.randint(0, len(candidates) - 1) if random.random() < 0.35 else -1
                conv_order_id, conv_pid = None, None
                if clicked_idx >= 0 and random.random() < 0.25:
                    clicked_pid = candidates[clicked_idx]
                    after = [(oid, ot, items) for oid, ot, items in my_orders if ot > shown_at]
                    matching = [(oid, ot, items) for oid, ot, items in after
                                if clicked_pid in [it[0] for it in items]]
                    pick = matching or after
                    if pick:
                        conv_order_id, _, _ = random.choice(pick)
                        conv_pid = clicked_pid
                for rank, pid in enumerate(candidates):
                    is_clicked = 1 if rank == clicked_idx else 0
                    clicked_at = shown_at + timedelta(seconds=random.randint(5, 300)) if is_clicked else None
                    is_converted = 1 if (is_clicked and conv_order_id and pid == conv_pid) else 0
                    impression_rows.append((
                        random.choices(ALGO_SOURCES, weights=[45, 35, 20])[0], is_clicked, clicked_at,
                        is_converted, conv_order_id if is_converted else None,
                        placement, rank, request_id, session_id, shown_at, pid, uid,
                    ))

        if view_rows:
            cur.executemany(
                "INSERT INTO product_views (referrer_product_id, session_id, source, viewed_at, product_id, user_id) "
                "VALUES (%s,%s,%s,%s,%s,%s)", view_rows,
            )
            first_id = cur.lastrowid
            manifest["product_view_ids"] = list(range(first_id, first_id + len(view_rows)))

        if search_rows:
            cur.executemany(
                "INSERT INTO search_logs (clicked_product_id, keyword, keyword_normalized, result_count, "
                "searched_at, session_id, user_id) VALUES (%s,%s,%s,%s,%s,%s,%s)", search_rows,
            )
            first_id = cur.lastrowid
            manifest["search_log_ids"] = list(range(first_id, first_id + len(search_rows)))

        if cart_rows:
            cur.executemany(
                "INSERT INTO cart_events (event_type, occurred_at, quantity, session_id, product_id, user_id) "
                "VALUES (%s,%s,%s,%s,%s,%s)", cart_rows,
            )
            first_id = cur.lastrowid
            manifest["cart_event_ids"] = list(range(first_id, first_id + len(cart_rows)))

        if impression_rows:
            cur.executemany(
                "INSERT INTO recommendation_impressions (algorithm_source, clicked, clicked_at, converted, "
                "converted_order_id, placement, rank_position, request_id, session_id, shown_at, product_id, user_id) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", impression_rows,
            )
            first_id = cur.lastrowid
            manifest["recommendation_impression_ids"] = list(range(first_id, first_id + len(impression_rows)))

        conn.commit()

        manifest_path = MANIFEST_DIR / f"seed_manifest_{NOW.strftime('%Y%m%d_%H%M%S')}.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

        print(f"Users: +{len(user_ids)} | Orders (PAID): +{len(order_ids)} | "
              f"order_detail: +{len(detail_rows)} | product_views: +{len(view_rows)} | "
              f"search_logs: +{len(search_rows)} | cart_events: +{len(cart_rows)} | "
              f"recommendation_impressions: +{len(impression_rows)}")
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
