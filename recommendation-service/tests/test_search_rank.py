# -*- coding: utf-8 -*-
"""Unit test cho Smart Search Phase A — rank.py + lexical.py thuần tính toán, không DB.

Nhánh semantic neural được giả lập bằng emb_matrix nhỏ tự dựng (không cần model ONNX
khi chạy test — encoder được monkeypatch), riêng test sanity encoder thật đánh dấu
skip nếu thiếu model local (CI/máy khác chưa tải).

Chạy: cd recommendation-service && venv\\Scripts\\python -m pytest tests/ -q
"""

from pathlib import Path

import numpy as np
import pytest

from app.config import settings
from app.search import lexical
from app.search import rank as rank_mod
from app.search.rank import rank_search
from app.store import ModelArtifacts


# ---------------------------------------------------------------- helpers

def make_art(**overrides) -> ModelArtifacts:
    """Artifacts tối thiểu 5 sản phẩm: 1-3 đồ sấy, 4 nước rửa chén, 5 sữa."""
    product_ids = [1, 2, 3, 4, 5]
    defaults = dict(
        model_version="test",
        tfidf_matrix=None,
        product_ids=product_ids,
        pid_to_idx={pid: i for i, pid in enumerate(product_ids)},
        neighbors={},
        rules={},
        popularity=[(1, 50.0), (2, 40.0), (3, 30.0), (4, 20.0), (5, 10.0)],
        popularity_by_category={},
        pid_to_category={1: 10, 2: 10, 3: 10, 4: 20, 5: 30},
        name_norm={
            1: "mit say gion goi 250g",
            2: "xoai say deo da lat",
            3: "chuoi say gion",
            4: "nuoc rua chen sunlight huong chanh",
            5: "sua tuoi vinamilk 100% 1l",
        },
    )
    defaults.update(overrides)
    return ModelArtifacts(**defaults)


class FakeEncoder:
    """Encoder giả: trả vector 1-hot-ish để kiểm soát cosine chính xác trong test."""

    def __init__(self, backend: str, query_sims: dict[int, float], art: ModelArtifacts):
        # query_sims: pid -> cosine mong muốn; dựng emb + query vector thoả mãn:
        # emb[pid] = e_i (one-hot), query = Σ sim_i * e_i (không normalize — chỉ cần dot đúng)
        self._backend = backend
        n = len(art.product_ids)
        self.emb = np.eye(n, dtype=np.float32)
        self.qv = np.zeros(n, dtype=np.float32)
        for pid, sim in query_sims.items():
            self.qv[art.pid_to_idx[pid]] = sim

    def backend(self) -> str:
        return self._backend

    def encode_query(self, query: str) -> np.ndarray:
        return self.qv


@pytest.fixture
def patch_encoder(monkeypatch):
    def _patch(backend: str, query_sims: dict[int, float], art: ModelArtifacts) -> FakeEncoder:
        fake = FakeEncoder(backend, query_sims, art)
        art.emb_matrix = fake.emb
        monkeypatch.setattr(rank_mod, "encoder", fake)
        return fake

    return _patch


# ---------------------------------------------------------------- lexical.py

def test_normalize_strips_diacritics_and_case():
    assert lexical.normalize("Đồ Sấy  KHÔ") == "do say kho"
    assert lexical.normalize("nước rửa chén") == "nuoc rua chen"
    assert lexical.normalize(None) == ""


def test_lexical_score_phrase_beats_scattered_words():
    # khớp nguyên cụm = 1.2, chỉ đủ từng từ = 1.0
    assert lexical.lexical_score("coca cola", "nuoc ngot coca cola lon 330ml") == 1.2
    assert lexical.lexical_score("coca cola", "nuoc coca vi cola") == 1.0


# ---------------------------------------------------------------- bất biến allowed_ids

def test_never_returns_products_outside_allowed_ids(patch_encoder):
    art = make_art()
    # semantic rất cao cho pid 4 và 5, nhưng allowed chỉ có [1, 2]
    patch_encoder("onnx", {1: 0.85, 2: 0.84, 4: 0.99, 5: 0.98}, art)
    items, _, matched = rank_search("đồ sấy", [1, 2], [], {}, art, limit=10)
    assert matched
    assert {pid for pid, _, _ in items} <= {1, 2}


def test_lexical_ids_outside_allowed_are_dropped(patch_encoder):
    art = make_art()
    patch_encoder("off", {}, art)
    # lexical_ids chứa 4 nhưng allowed chỉ [1] — 4 phải bị loại (phòng thủ tập con)
    items, _, matched = rank_search("mít", [1], [1, 4], {}, art, limit=10)
    assert matched
    assert [pid for pid, _, _ in items] == [1]


# ---------------------------------------------------------------- gate query rác

def test_gate_blocks_semantic_when_top1_below_threshold(patch_encoder):
    art = make_art()
    # mọi cosine dưới gate 0.82 → semantic coi như không có tín hiệu
    patch_encoder("onnx", {1: 0.75, 2: 0.74, 3: 0.70}, art)
    items, source, matched = rank_search("asdf xyz", [1, 2, 3, 4, 5], [], {}, art, limit=10)
    assert not matched
    assert items == []
    assert source == "SEMANTIC_HYBRID"


def test_min_sim_floor_cuts_low_candidates(patch_encoder):
    art = make_art()
    # top1=0.9 vượt gate, nhưng pid 3 (0.60) dưới sàn 0.78 → chỉ 1, 2 lọt
    patch_encoder("onnx", {1: 0.90, 2: 0.80, 3: 0.60}, art)
    items, _, matched = rank_search("đồ sấy", [1, 2, 3, 4, 5], [], {}, art, limit=10)
    assert matched
    assert {pid for pid, _, _ in items} == {1, 2}


def test_garbage_query_with_empty_lexical_returns_no_match(patch_encoder):
    art = make_art()
    patch_encoder("off", {}, art)  # backend off → semantic rỗng, lexical cũng rỗng
    items, source, matched = rank_search("xzqw vbnk", [1, 2, 3], [], {}, art, limit=10)
    assert not matched and items == [] and source == "LEXICAL_ONLY"


# ---------------------------------------------------------------- blend & thứ hạng

def test_exact_name_match_beats_semantic_only(patch_encoder):
    art = make_art()
    # pid 2 semantic cao nhất (0.95), pid 1 vừa lexical vừa semantic thấp hơn (0.83)
    patch_encoder("onnx", {1: 0.83, 2: 0.95}, art)
    items, _, _ = rank_search("mít sấy giòn gói 250g", [1, 2, 3, 4, 5], [1], {}, art, limit=10)
    assert items[0][0] == 1  # khớp tên phải thắng semantic thuần (w_lex=1.0 > w_sem=0.8)
    assert items[0][2] == "LEXICAL"


def test_personal_reorders_within_semantic_group_but_not_over_lexical(patch_encoder):
    art = make_art()
    # pid 3 semantic THẤP nhất trong nhóm nhưng hợp gu user nhất → personal phải kéo
    # pid 3 vượt pid 2 (semantic nhỉnh hơn) — đúng yêu cầu "hàng hợp gu lên đầu
    # trong nhóm liên quan"
    patch_encoder("onnx", {1: 0.90, 2: 0.85, 3: 0.83}, art)
    items, _, _ = rank_search("đồ sấy", [1, 2, 3, 4, 5], [], {3: 9.9}, art, limit=10)
    order = [pid for pid, _, _ in items]
    assert order.index(3) < order.index(2)
    labels = {pid: src for pid, _, src in items}
    assert labels[3] == "PERSONALIZED"  # đóng góp lớn nhất của pid 3 là cá nhân hoá
    # nhưng thêm lexical match cho pid 2 thì pid 2 vẫn phải trên pid 3
    items2, _, _ = rank_search("đồ sấy", [1, 2, 3, 4, 5], [2], {3: 9.9}, art, limit=10)
    order2 = [pid for pid, _, _ in items2]
    assert order2.index(2) < order2.index(3)


def test_semantic_rescue_when_lexical_empty(patch_encoder):
    art = make_art()
    patch_encoder("onnx", {1: 0.87, 2: 0.86, 3: 0.85}, art)
    # "đồ ăn ngon" — lexical DB rỗng nhưng semantic vẫn cứu được kết quả
    items, source, matched = rank_search("đồ ăn ngon", [1, 2, 3, 4, 5], [], {}, art, limit=10)
    assert matched and len(items) == 3
    assert source == "SEMANTIC_HYBRID"


def test_limit_and_max_ranked_cap(patch_encoder):
    art = make_art()
    patch_encoder("onnx", {1: 0.9, 2: 0.89, 3: 0.88, 4: 0.87, 5: 0.86}, art)
    items, _, _ = rank_search("đồ", [1, 2, 3, 4, 5], [], {}, art, limit=2)
    assert len(items) == 2


# ---------------------------------------------------------------- .env override

def test_weights_respect_settings_override(patch_encoder, monkeypatch):
    art = make_art()
    patch_encoder("onnx", {1: 0.83, 2: 0.95}, art)
    # tắt hẳn lexical qua settings → semantic thuần thắng
    monkeypatch.setattr(settings, "w_search_lexical", 0.0)
    items, _, _ = rank_search("mít sấy giòn gói 250g", [1, 2, 3, 4, 5], [1], {}, art, limit=10)
    assert items[0][0] == 2


# ---------------------------------------------------------------- backend degrade

def test_backend_off_still_serves_lexical_with_personal_and_popularity(patch_encoder):
    art = make_art()
    patch_encoder("off", {}, art)
    items, source, matched = rank_search("sấy", [1, 2, 3, 4, 5], [1, 2, 3], {2: 5.0}, art, limit=10)
    assert matched and source == "LEXICAL_ONLY"
    assert {pid for pid, _, _ in items} == {1, 2, 3}
    assert items[0][0] == 2  # cùng lexical 1.0 — personal quyết định thứ tự


def test_tfidf_backend_uses_vectorizer_from_artifacts(patch_encoder):
    from sklearn.feature_extraction.text import TfidfVectorizer

    docs = ["mit say gion", "xoai say deo", "chuoi say gion", "nuoc rua chen", "sua tuoi"]
    vec = TfidfVectorizer()
    matrix = vec.fit_transform(docs)
    art = make_art(tfidf_vectorizer=vec, tfidf_matrix=matrix)
    art.emb_matrix = None

    class TfidfOnlyEncoder:
        def backend(self):
            return "tfidf"

    import app.search.rank as rmod
    orig = rmod.encoder
    rmod.encoder = TfidfOnlyEncoder()
    try:
        items, source, matched = rank_search("say", [1, 2, 3, 4, 5], [], {}, art, limit=10)
    finally:
        rmod.encoder = orig
    assert matched and source == "TFIDF_HYBRID"
    assert {pid for pid, _, _ in items} == {1, 2, 3}  # chỉ 3 sản phẩm chứa "say"


# ---------------------------------------------------------------- sanity encoder thật

MODEL_DIR = Path(__file__).resolve().parents[1] / "data" / "models" / "multilingual-e5-small"


@pytest.mark.skipif(
    not (MODEL_DIR / "onnx" / "model.onnx").exists(),
    reason="model ONNX chưa tải (chạy scripts/check_embedding_env.py)",
)
def test_real_encoder_sanity_cosine():
    """Bắt lỗi quên prefix query:/passage: hoặc pooling sai — cặp gần nghĩa phải thắng rõ.
    (Passage PHẢI kèm category — bài học spike: tên trần làm E5-small xếp sai.)"""
    from app.search.encoder import _Encoder

    enc = _Encoder()
    if enc.backend() != "onnx":
        pytest.skip("backend onnx không load được trên máy này")
    q = enc._encode_raw(["query: đồ sấy khô"])[0]
    passages = enc.encode_passages([
        "Mít sấy giòn gói 250g. Trái cây sấy khô.",
        "Nước rửa chén Sunlight hương chanh. Hóa phẩm tẩy rửa.",
    ])
    sim_near, sim_far = float(q @ passages[0]), float(q @ passages[1])
    assert sim_near > sim_far, f"prefix/pooling sai? near={sim_near:.3f} far={sim_far:.3f}"
