"""Content-based: TF-IDF trên tên + category + mô tả + price-bucket, cosine top-K neighbors.

Bigram bù cho việc không tách từ tiếng Việt; price-bucket quintile TRONG từng category
(đồng hạng giá trong cùng ngành hàng mới có nghĩa với bách hóa).
"""

import re

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

from app.db import fetch_df

CATALOG_SQL = """
SELECT p.id, p.product_name, p.description, p.price, p.category_id, c.name AS category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.active = 1 AND p.quantity > 0
"""

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str | None) -> str:
    return _TAG_RE.sub(" ", text or "")


def _price_bucket_tokens(df: pd.DataFrame) -> pd.Series:
    """Token dạng pricebucket_<catId>_q<n> — quintile giá trong từng category."""
    tokens = pd.Series("", index=df.index)
    for cat_id, group in df.groupby("category_id"):
        try:
            buckets = pd.qcut(group["price"], 5, labels=False, duplicates="drop")
        except ValueError:  # category quá ít sản phẩm / giá đồng nhất
            buckets = pd.Series(0, index=group.index)
        tokens.loc[group.index] = buckets.fillna(0).astype(int).map(
            lambda q, c=cat_id: f"pricebucket_{c}_q{q}"
        )
    return tokens


def build(top_k: int) -> tuple:
    """Trả về (tfidf_matrix l2-normalized, product_ids, pid_to_idx, neighbors, vectorizer, df).

    vectorizer + df thêm từ Smart Search Phase A: vectorizer cho Plan C TF-IDF query-vector
    (trước đây bị vứt sau build), df cho embeddings.build() + name_norm (cùng 1 lần query
    catalog, đảm bảo emb_matrix thẳng hàng với product_ids)."""
    df = fetch_df(CATALOG_SQL)
    if df.empty:
        return None, [], {}, {}, None, df

    df = df.reset_index(drop=True)
    docs = (
        ((df["product_name"].fillna("") + " ") * 3)
        + ((df["category"].fillna("") + " ") * 2)
        + df["description"].map(_strip_html)
        + " "
        + _price_bucket_tokens(df)
    )

    vectorizer = TfidfVectorizer(
        lowercase=True, ngram_range=(1, 2), max_features=20000, sublinear_tf=True
    )
    matrix = vectorizer.fit_transform(docs)  # norm='l2' mặc định → dot = cosine

    product_ids = df["id"].astype(int).tolist()
    pid_to_idx = {pid: i for i, pid in enumerate(product_ids)}

    sims = linear_kernel(matrix, matrix)
    np.fill_diagonal(sims, -1.0)  # loại chính nó
    neighbors: dict[int, list[tuple[int, float]]] = {}
    k = min(top_k, len(product_ids) - 1)
    for i, pid in enumerate(product_ids):
        top_idx = np.argpartition(-sims[i], k)[:k] if k > 0 else np.array([], dtype=int)
        top_idx = top_idx[np.argsort(-sims[i][top_idx])]
        neighbors[pid] = [
            (product_ids[j], float(sims[i][j])) for j in top_idx if sims[i][j] > 0
        ]

    return matrix, product_ids, pid_to_idx, neighbors, vectorizer, df
