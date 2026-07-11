"""Chuẩn hoá không dấu + chấm độ khớp tên cho nhánh lexical của Smart Search.

Membership của lexical_ids do JAVA quyết (LIKE từng từ trên DB, collation
accent-insensitive) — Python chỉ TINH CHỈNH độ đậm/nhạt bên trong tập đó:
khớp đủ mọi từ = 1.0, khớp nguyên cụm liền = 1.2 (người gõ đúng tên phải thấy
đúng nó đứng #1). Port logic bỏ dấu của stripDiacritics (FE) / normalizeKeyword (Java).
"""

import re
import unicodedata

_SPACE_RE = re.compile(r"\s+")


def normalize(text: str | None) -> str:
    """Bỏ dấu tiếng Việt + lowercase + gộp khoảng trắng — khớp convention
    keyword_normalized của Java (NFD strip combining marks, đ→d)."""
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    stripped = stripped.replace("đ", "d").replace("Đ", "D")
    return _SPACE_RE.sub(" ", stripped).strip().lower()


def lexical_score(query_norm: str, name_norm: str) -> float:
    """Điểm khớp tên trong [1.0, 1.2] cho item ĐÃ thuộc lexical_ids.

    Base 1.0 (Java đã đảm bảo mọi từ đều xuất hiện trong tên); +0.2 nếu khớp
    nguyên cụm truy vấn liền mạch (phrase match — "coca cola" đứng trên
    "coca vị cola" khi khách gõ đúng tên).
    """
    if query_norm and query_norm in name_norm:
        return 1.2
    return 1.0
