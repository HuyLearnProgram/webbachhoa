"""Build ma trận embedding catalog cho Smart Search (chạy trong train_all()).

Document mỗi sản phẩm = "{tên}. {category}. {description strip HTML cắt 500 ký tự}"
(prefix "passage: " do encoder tự thêm). BẮT BUỘC kèm category — spike thực tế cho thấy
tên trần làm E5-small xếp sai ("Mít sấy giòn" thua "Nước rửa chén" với query "đồ sấy khô"),
thêm category vào là thứ hạng đúng và tách bạch rõ.

Cache data/emb_cache.npz theo (product_id, md5(document)) — retrain nightly chỉ encode
sản phẩm mới/sửa; restart service nạp lại từ cache trong ~1s thay vì encode cả catalog.
"""

import hashlib
import logging
import re
from pathlib import Path

import numpy as np
import pandas as pd

from app.search.encoder import encoder

logger = logging.getLogger(__name__)

CACHE_PATH = Path("data/emb_cache.npz")
_TAG_RE = re.compile(r"<[^>]+>")
_DESC_MAX_CHARS = 500  # mô tả dài chỉ pha loãng tín hiệu tên+category


def _document(row) -> str:
    name = (row.product_name or "").strip()
    category = (row.category or "").strip()
    desc = _TAG_RE.sub(" ", row.description or "").strip()[:_DESC_MAX_CHARS]
    return f"{name}. {category}. {desc}".strip()


def _cache_key(pid: int, doc: str) -> str:
    return f"{pid}:{hashlib.md5(doc.encode('utf-8')).hexdigest()}"


def _load_cache() -> dict[str, np.ndarray]:
    if not CACHE_PATH.exists():
        return {}
    try:
        with np.load(str(CACHE_PATH)) as data:
            return {key: data[key] for key in data.files}
    except Exception:  # noqa: BLE001 — cache hỏng thì encode lại từ đầu, không chết train
        logger.warning("search: emb_cache.npz hỏng — bỏ qua, encode lại toàn bộ.")
        return {}


def build(df: pd.DataFrame) -> np.ndarray | None:
    """Ma trận [len(df), 384] float32 l2-normalized, hàng i ứng df.iloc[i]
    (cùng thứ tự product_ids của content_based). None khi không có backend neural."""
    if encoder.backend() not in ("onnx", "torch"):
        return None
    if df.empty:
        return None

    docs = [_document(row) for row in df.itertuples(index=False)]
    keys = [_cache_key(int(pid), doc) for pid, doc in zip(df["id"], docs)]

    cache = _load_cache()
    missing_idx = [i for i, key in enumerate(keys) if key not in cache]
    if missing_idx:
        fresh = encoder.encode_passages([docs[i] for i in missing_idx])
        for j, i in enumerate(missing_idx):
            cache[keys[i]] = fresh[j]
        logger.info("search: encode %d/%d sản phẩm mới/sửa (còn lại từ cache).",
                    len(missing_idx), len(docs))

    matrix = np.stack([cache[key] for key in keys]).astype(np.float32)

    # Ghi lại cache CHỈ với sản phẩm hiện hành — không phình vô hạn theo sản phẩm đã xoá
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(str(CACHE_PATH), **{key: cache[key] for key in keys})
    except OSError:
        logger.warning("search: không ghi được emb_cache.npz — lần start sau sẽ encode lại.")

    return matrix
