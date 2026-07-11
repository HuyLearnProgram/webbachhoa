# -*- coding: utf-8 -*-
r"""Calibrate ngưỡng semantic search trên catalog THẬT (Phase A, bước bắt buộc).

Các ngưỡng search_sem_top1_gate/search_sem_min_sim trong config là điểm khởi đầu từ
spike 10 sản phẩm giả — KHÔNG được tin cho tới khi chạy script này trên catalog thật.

In ra: top-10 + cosine cho từng query mẫu (nhu cầu thật / tên chính xác / query rác),
phân bố top-1 theo nhóm, và đề xuất gate. Chỉnh ngưỡng qua .env (SEARCH_SEM_TOP1_GATE,
SEARCH_SEM_MIN_SIM), KHÔNG sửa code.

Chạy: cd recommendation-service && venv\Scripts\python -X utf8 scripts/calibrate_search.py
(Cần MySQL chạy; không cần service — script tự build embedding, tận dụng emb_cache.npz.)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np

from app.candidates.content_based import CATALOG_SQL
from app.config import settings
from app.db import fetch_df
from app.search import embeddings
from app.search.encoder import encoder

# Query nhu cầu thật (kỳ vọng CÓ tín hiệu) + tên gần đúng + query rác (kỳ vọng KHÔNG)
NEED_QUERIES = [
    "đồ ăn ngon", "thực phẩm sạch", "đồ sấy", "đồ ăn vặt", "đồ uống giải khát",
    "gia vị nấu ăn", "đồ tẩy rửa", "trái cây tươi", "đồ ăn sáng", "thực phẩm hữu cơ",
    "rau củ", "thịt cá", "sữa cho bé", "bánh kẹo", "đồ khô",
]
GARBAGE_QUERIES = ["asdf xyz qwerty", "zzz kkk", "lorem ipsum dolor", "qwe rty uio", "xxxyyy zzz"]


def main() -> None:
    if encoder.backend() not in ("onnx", "torch"):
        print(f"backend = {encoder.backend()} — khong co encoder neural, khong co gi de calibrate")
        sys.exit(1)

    df = fetch_df(CATALOG_SQL).reset_index(drop=True)
    if df.empty:
        print("catalog rong")
        sys.exit(1)
    emb = embeddings.build(df)
    names = df["product_name"].tolist()
    cats = df["category"].tolist()
    print(f"catalog: {len(df)} san pham, backend={encoder.backend()}")
    print(f"nguong hien tai: top1_gate={settings.search_sem_top1_gate}, "
          f"min_sim={settings.search_sem_min_sim}\n")

    def top1s(queries: list[str], show: bool = True) -> list[float]:
        out = []
        for q in queries:
            sims = emb @ encoder.encode_query(q)
            order = np.argsort(-sims)
            out.append(float(sims[order[0]]))
            if show:
                print(f"--- {q!r} (top-1 = {sims[order[0]]:.4f})")
                for i in order[:10]:
                    marker = "*" if sims[i] >= settings.search_sem_min_sim else " "
                    print(f"  {marker} {sims[i]:.4f}  {names[i][:50]}  [{cats[i]}]")
        return out

    print("========== QUERY NHU CAU THAT ==========")
    need_top1 = top1s(NEED_QUERIES)
    print("\n========== QUERY RAC ==========")
    garbage_top1 = top1s(GARBAGE_QUERIES)

    print("\n========== TONG KET ==========")
    print(f"top-1 nhu cau : min={min(need_top1):.4f}  median={np.median(need_top1):.4f}  "
          f"max={max(need_top1):.4f}")
    print(f"top-1 rac     : min={min(garbage_top1):.4f}  median={np.median(garbage_top1):.4f}  "
          f"max={max(garbage_top1):.4f}")
    lo, hi = max(garbage_top1), min(need_top1)
    if hi > lo:
        mid = (lo + hi) / 2
        print(f"khoang tach   : ({lo:.4f}, {hi:.4f}) — gate de xuat ~{mid:.2f}")
    else:
        print(f"CANH BAO: khong tach duoc rac/that (rac max {lo:.4f} >= that min {hi:.4f}) — "
              "xem lai query mau hoac chat luong mo ta san pham")
    gate = settings.search_sem_top1_gate
    blocked = sum(1 for s in need_top1 if s < gate)
    passed_garbage = sum(1 for s in garbage_top1 if s >= gate)
    print(f"voi gate {gate}: chan nham {blocked}/{len(need_top1)} query that, "
          f"lot {passed_garbage}/{len(garbage_top1)} query rac")


if __name__ == "__main__":
    main()
