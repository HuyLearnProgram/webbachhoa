"""Encoder embedding cho Smart Search — singleton load 1 lần lúc process start.

Bậc thang backend (config search_embedding_backend, mặc định "auto"):
  onnx  → onnxruntime + tokenizers, model intfloat/multilingual-e5-small tải sẵn
          vào data/models/multilingual-e5-small/ (chạy scripts/check_embedding_env.py
          để tải — service KHÔNG tự tải lúc start, tránh treo startup vì mạng).
  torch → sentence-transformers + torch CPU (Plan B, chỉ khi cài tay).
  tfidf → không encoder neural; rank.py tự dùng tfidf_vectorizer trong ModelArtifacts.
  off   → tắt hẳn nhánh semantic, chỉ còn lexical + personal + popularity.

NGHI THỨC E5 BẮT BUỘC (sai là chất lượng rớt thảm mà không báo lỗi — đã kiểm chứng
trong spike): prefix "query: " cho câu truy vấn, "passage: " cho document sản phẩm,
mean-pooling theo attention mask, l2-normalize. encode_query/encode_passages ở đây
TỰ THÊM prefix — caller truyền text trần.
"""

import logging
import threading
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

_BATCH = 16  # chặn RAM khi encode catalog; CPU không lợi gì với batch to hơn


class _Encoder:
    """Lazy singleton — backend chỉ resolve ở lần dùng đầu (sau khi settings load)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._backend: str | None = None
        self._onnx_session = None
        self._onnx_tokenizer = None
        self._st_model = None

    # ---------------------------------------------------------------- backend

    def backend(self) -> str:
        if self._backend is None:
            with self._lock:
                if self._backend is None:
                    self._backend = self._resolve_backend()
        return self._backend

    def _resolve_backend(self) -> str:
        want = settings.search_embedding_backend.lower()
        if want == "off":
            return "off"
        if want in ("auto", "onnx") and self._try_onnx():
            return "onnx"
        if want == "onnx":
            logger.warning("search: backend=onnx không load được — hạ xuống tfidf.")
            return "tfidf"
        if want in ("auto", "torch") and self._try_torch():
            return "torch"
        if want == "torch":
            logger.warning("search: backend=torch không load được — hạ xuống tfidf.")
            return "tfidf"
        if want == "auto":
            logger.warning("search: không có backend neural nào — degrade tfidf (Plan C).")
        return "tfidf"

    def _try_onnx(self) -> bool:
        model_dir = Path(settings.search_model_dir)
        onnx_path = model_dir / "onnx" / "model.onnx"
        tok_path = model_dir / "tokenizer.json"
        if not onnx_path.exists() or not tok_path.exists():
            logger.warning(
                "search: thiếu model ONNX tại %s — chạy scripts/check_embedding_env.py để tải.",
                model_dir,
            )
            return False
        try:
            import onnxruntime as ort
            from tokenizers import Tokenizer

            tokenizer = Tokenizer.from_file(str(tok_path))
            tokenizer.enable_truncation(max_length=512)
            tokenizer.enable_padding()
            session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
            self._onnx_input_names = {i.name for i in session.get_inputs()}
            self._onnx_tokenizer = tokenizer
            self._onnx_session = session
            logger.info("search: encoder ONNX sẵn sàng (%s).", onnx_path)
            return True
        except Exception:  # noqa: BLE001 — mọi lỗi load đều rơi bậc, không giết service
            logger.exception("search: load ONNX lỗi.")
            return False

    def _try_torch(self) -> bool:
        try:
            from sentence_transformers import SentenceTransformer

            self._st_model = SentenceTransformer("intfloat/multilingual-e5-small", device="cpu")
            logger.info("search: encoder sentence-transformers (torch CPU) sẵn sàng.")
            return True
        except Exception:  # noqa: BLE001
            logger.info("search: sentence-transformers không khả dụng (bình thường nếu chưa cài).")
            return False

    # ---------------------------------------------------------------- encode

    def _encode_raw(self, texts: list[str]) -> np.ndarray:
        """Encode text ĐÃ có prefix E5 → ma trận l2-normalized [n, 384] float32."""
        if self.backend() == "onnx":
            return self._encode_onnx(texts)
        if self.backend() == "torch":
            emb = self._st_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.asarray(emb, dtype=np.float32)
        raise RuntimeError(f"backend {self.backend()!r} không encode được")

    def _encode_onnx(self, texts: list[str]) -> np.ndarray:
        out: list[np.ndarray] = []
        for start in range(0, len(texts), _BATCH):
            encs = self._onnx_tokenizer.encode_batch(texts[start : start + _BATCH])
            ids = np.array([e.ids for e in encs], dtype=np.int64)
            mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
            feed = {"input_ids": ids, "attention_mask": mask}
            if "token_type_ids" in self._onnx_input_names:
                feed["token_type_ids"] = np.zeros_like(ids)
            (hidden,) = self._onnx_session.run(["last_hidden_state"], feed)
            m = mask[:, :, None].astype(np.float32)
            emb = (hidden * m).sum(axis=1) / np.clip(m.sum(axis=1), 1e-9, None)
            # Guard chia-cho-0: vector toàn số 0 (text rỗng/tokenizer trả toàn padding) sẽ có norm=0,
            # np.clip tránh NaN lan truyền âm thầm vào cosine similarity ở tầng rank.py.
            out.append(emb / np.clip(np.linalg.norm(emb, axis=1, keepdims=True), 1e-9, None))
        return np.concatenate(out, axis=0).astype(np.float32)

    def encode_passages(self, texts: list[str]) -> np.ndarray:
        return self._encode_raw([f"passage: {t}" for t in texts])

    def encode_query(self, query: str) -> np.ndarray:
        """Vector [384] cho câu truy vấn — LRU cache theo query đã trim/lower
        (người dùng lặp lại cùng từ khoá rất thường xuyên)."""
        return _cached_query_vector(query.strip().lower())


encoder = _Encoder()


@lru_cache(maxsize=512)
def _cached_query_vector(query_normalized: str) -> np.ndarray:
    return encoder._encode_raw([f"query: {query_normalized}"])[0]
