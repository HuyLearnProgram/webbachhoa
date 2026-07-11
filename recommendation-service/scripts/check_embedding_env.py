# -*- coding: utf-8 -*-
r"""Spike kiểm tra môi trường embedding cho Smart Search (Phase A, bước 1).

Bài học từ vụ `implicit` (không build được wheel trên Windows/py3.12/numpy2):
PHẢI xác nhận cài đặt + chạy được thư viện TRƯỚC khi viết code chính phụ thuộc vào nó.

Kiểm tra Plan A của Smart_Search_Roadmap.docx:
  1. Import onnxruntime + tokenizers + huggingface_hub.
  2. Tải intfloat/multilingual-e5-small (tokenizer + ONNX) về data/models/multilingual-e5-small/.
  3. Encode 3 câu tiếng Việt (đúng nghi thức E5: prefix "query: "/"passage: ",
     mean-pooling theo attention mask, l2-normalize).
  4. Sanity: cosine("đồ sấy khô", "mít sấy giòn") PHẢI > cosine("đồ sấy khô", "nước rửa chén").

Chạy: cd recommendation-service && venv\Scripts\python scripts/check_embedding_env.py
Exit 0 = Plan A dùng được; exit khác 0 kèm log = rơi xuống Plan B/C theo roadmap.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "data" / "models" / "multilingual-e5-small"
REPO_ID = "intfloat/multilingual-e5-small"


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def main() -> None:
    # ---- 1. import
    try:
        import numpy as np
        import onnxruntime as ort
        from tokenizers import Tokenizer
        from huggingface_hub import snapshot_download
    except Exception as e:  # noqa: BLE001
        fail(f"import loi: {e!r}")
    print(f"OK import: onnxruntime {ort.__version__}, numpy {np.__version__}")

    # ---- 2. tải model (idempotent — snapshot_download tự bỏ qua file đã có)
    try:
        snapshot_download(
            repo_id=REPO_ID,
            local_dir=str(MODEL_DIR),
            allow_patterns=["tokenizer.json", "config.json", "onnx/model.onnx"],
        )
    except Exception as e:  # noqa: BLE001
        fail(f"tai model loi (mang/HF?): {e!r}")
    onnx_path = MODEL_DIR / "onnx" / "model.onnx"
    tok_path = MODEL_DIR / "tokenizer.json"
    if not onnx_path.exists() or not tok_path.exists():
        fail(f"thieu file sau khi tai: onnx={onnx_path.exists()} tokenizer={tok_path.exists()}")
    print(f"OK model: {onnx_path} ({onnx_path.stat().st_size / 1e6:.0f} MB)")

    # ---- 3. encode đúng nghi thức E5
    tokenizer = Tokenizer.from_file(str(tok_path))
    tokenizer.enable_truncation(max_length=512)
    tokenizer.enable_padding()
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_names = {i.name for i in sess.get_inputs()}
    print(f"OK session, inputs: {sorted(input_names)}")

    def encode(texts: list[str]) -> "np.ndarray":
        encs = tokenizer.encode_batch(texts)
        ids = np.array([e.ids for e in encs], dtype=np.int64)
        mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in input_names:
            feed["token_type_ids"] = np.zeros_like(ids)
        (hidden,) = sess.run(["last_hidden_state"], feed)
        m = mask[:, :, None].astype(np.float32)
        emb = (hidden * m).sum(axis=1) / np.clip(m.sum(axis=1), 1e-9, None)  # mean-pool
        return emb / np.linalg.norm(emb, axis=1, keepdims=True)  # l2-norm

    # LƯU Ý (phát hiện khi spike lần đầu): passage chỉ có TÊN TRẦN thì E5-small xếp sai
    # ("Mít sấy giòn gói 250g" thua "Nước rửa chén..." với query "đồ sấy khô").
    # Passage PHẢI kèm category như thiết kế document trong roadmap (tên + category + mô tả)
    # thì thứ hạng mới đúng và tách bạch rõ. Đây là lý do embeddings.py không được bỏ category.
    query = encode(["query: đồ sấy khô"])
    passages = encode([
        "passage: Mít sấy giòn gói 250g. Trái cây sấy khô.",
        "passage: Nước rửa chén Sunlight hương chanh. Hóa phẩm tẩy rửa.",
    ])
    garbage = encode(["query: asdf xyz qwerty"])
    sim = (query @ passages.T)[0]
    g_top = float((garbage @ passages.T).max())
    print(f"cosine('do say kho' vs 'mit say + category')    = {sim[0]:.4f}")
    print(f"cosine('do say kho' vs 'nuoc rua chen + cat')   = {sim[1]:.4f}")
    print(f"max cosine query rac 'asdf xyz qwerty'          = {g_top:.4f}")

    # ---- 4. sanity
    if not sim[0] > sim[1]:
        fail("sanity cosine SAI: cap gan nghia khong cao hon cap xa nghia — kiem tra prefix/pooling")
    if not g_top < sim[0]:
        fail("sanity gate SAI: query rac khong thap hon match that")
    print("PASS: Plan A (ONNX) dung duoc — cap gan nghia thang, query rac tach ro (gate 0.82 hop ly)")


if __name__ == "__main__":
    main()
