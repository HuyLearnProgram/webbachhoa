# -*- coding: utf-8 -*-
r"""Sinh tài liệu thiết kế "Tìm kiếm thông minh" (Smart_Search_Roadmap.docx).

Tài liệu MỚI, tách riêng khỏi AI_Recommendation_Roadmap.docx (roadmap gợi ý đã đóng
sau Phase 3). Cùng bộ style: heading built-in, code-box Consolas nền xanh nhạt,
bảng "Light Grid Accent 1", sơ đồ matplotlib vẽ hộp bo góc.

Nội dung viết lại (2026-07-12) theo hướng dễ hiểu, ngắn gọn — hạn chế thuật ngữ kỹ
thuật trong phần mô tả, chỉ giữ chi tiết kỹ thuật (tên file, config) ở Phần IV dạng
bảng tham chiếu cho dev. Nội dung kỹ thuật đầy đủ hơn (công thức, API contract) đã
được rút gọn; xem trực tiếp code trong repo nếu cần chi tiết triển khai.

Chạy: cd recommendation-service && venv\Scripts\python scripts/docx_assets/build_smart_search_roadmap.py
(Đóng file Word trước khi chạy — script ghi đè trực tiếp Smart_Search_Roadmap.docx.)
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.shared import Pt, Inches, RGBColor

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "Smart_Search_Roadmap.docx"
ASSETS = Path(__file__).resolve().parent

BLUE, GREEN, ORANGE, RED, GRAY = "#2a78d6", "#1baf7a", "#eda100", "#e34948", "#5b5b5b"


# ---------------------------------------------------------------- docx helpers

def title(d, t):
    d.add_paragraph(t, style="Title")


def h1(d, t):
    d.add_paragraph(t, style="Heading 1")


def h2(d, t):
    d.add_paragraph(t, style="Heading 2")


def h3(d, t):
    d.add_paragraph(t, style="Heading 3")


def p(d, t):
    d.add_paragraph(t, style="Normal")


def bullet(d, t):
    d.add_paragraph(t, style="List Bullet")


def num(d, t):
    d.add_paragraph(t, style="List Number")


def picture(d, img: Path, caption: str):
    d.add_picture(str(img), width=Inches(6.3))
    d.add_paragraph(caption, style="Caption")


def code_box(d, text: str):
    """1x1 table nền xanh nhạt viền mảnh, font Consolas — đúng style code-box của
    AI_Recommendation_Roadmap.docx (nền F3F6F4, viền C7D3CB, chữ 2A3831 9pt)."""
    table = d.add_table(rows=1, cols=1)
    table.style = "Normal Table"
    cell = table.rows[0].cells[0]

    tcPr = cell._element.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), "F3F6F4")
    tcPr.append(shd)
    borders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "C7D3CB")
        borders.append(el)
    tcPr.append(borders)

    para = cell.paragraphs[0]
    lines = text.strip("\n").split("\n")
    for i, line in enumerate(lines):
        run = para.add_run(line if i == 0 else "")
        if i > 0:
            run.add_break()
            run.text = line
        run.font.name = "Consolas"
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x2A, 0x38, 0x31)
    d.add_paragraph()


def data_table(d, headers, rows):
    table = d.add_table(rows=1, cols=len(headers))
    table.style = "Light Grid Accent 1"
    for i, htext in enumerate(headers):
        table.rows[0].cells[i].text = htext
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = val
    d.add_paragraph()


# ---------------------------------------------------------------- sơ đồ

def _box(ax, xy, w, h, text, color, fs=10):
    x, y = xy
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.06",
                                fc=color, ec="none", alpha=0.14))
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.06",
                                fc="none", ec=color, lw=1.6))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color="#222", wrap=True)


def _arrow(ax, a, b, color=GRAY, style="-|>", lw=1.6, ls="-"):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle=style, mutation_scale=16,
                                 color=color, lw=lw, linestyle=ls))


def draw_search_pipeline(path: Path) -> None:
    """Sơ đồ 1: luồng xử lý 1 lượt tìm kiếm + 3 lớp dự phòng khi có sự cố."""
    fig, ax = plt.subplots(figsize=(10.5, 5.8))
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 5.8)
    ax.axis("off")

    # hàng trên: luồng chính
    _box(ax, (0.2, 4.4), 2.0, 1.0, "Khách gõ\n\"đồ ăn ngon\"", BLUE, fs=9)
    _box(ax, (2.7, 4.4), 2.6, 1.0, "Hệ thống lọc đúng điều kiện\n(còn hàng, danh mục, giá...)\ntrước khi xếp hạng", BLUE, fs=9)
    _box(ax, (5.8, 4.4), 2.4, 1.0, "AI xếp hạng trong đúng\ndanh sách đã lọc,\nưu tiên theo sở thích", GREEN, fs=9)
    _box(ax, (8.6, 4.4), 1.7, 1.0, "Trả kết quả\n(giá luôn\nlấy mới nhất)", BLUE, fs=9)
    _arrow(ax, (2.2, 4.9), (2.7, 4.9))
    _arrow(ax, (5.3, 4.9), (5.8, 4.9))
    _arrow(ax, (8.2, 4.9), (8.6, 4.9))

    # hàng giữa: 3 lớp dự phòng — mỗi lớp đặt thẳng dưới đúng bước của nó
    _box(ax, (0.2, 2.3), 2.0, 1.0, "Lớp 3 — Giao diện:\nAPI mới lỗi/tắt\n→ dùng lại tìm kiếm cũ", RED, fs=8.5)
    _box(ax, (2.7, 2.3), 2.6, 1.0, "Lớp 2 — Hệ thống chính:\nAI ngừng/chậm\n→ chuyển sang khớp tên", RED, fs=9)
    _box(ax, (5.8, 2.3), 2.4, 1.0, "Lớp 1 — Trong AI:\nmô hình chính lỗi\n→ tự chuyển cách nhẹ hơn", RED, fs=9)
    _arrow(ax, (1.2, 4.4), (1.2, 3.3), color=RED, ls=(0, (4, 3)))
    _arrow(ax, (4.0, 4.4), (4.0, 3.3), color=RED, ls=(0, (4, 3)))
    _arrow(ax, (7.0, 4.4), (7.0, 3.3), color=RED, ls=(0, (4, 3)))
    ax.text(1.35, 3.85, "sự cố", fontsize=8, color=RED, ha="left", style="italic")
    ax.text(4.15, 3.85, "sự cố", fontsize=8, color=RED, ha="left", style="italic")
    ax.text(7.15, 3.85, "sự cố", fontsize=8, color=RED, ha="left", style="italic")

    # nguyên tắc — đặt bên phải, cột không có lớp dự phòng
    ax.text(9.45, 2.8, "AI chỉ xếp hạng\ntrong danh sách ĐÃ LỌC —\nkhông bao giờ vượt qua\nđiều kiện lọc",
            ha="center", fontsize=8.5, color=GREEN, style="italic")

    # hàng dưới
    _box(ax, (2.4, 0.5), 5.6, 1.0,
         "Không lớp nào được phép làm hỏng trang tìm kiếm —\ntệ nhất khách vẫn nhận kết quả như tìm kiếm cũ", ORANGE, fs=9.5)
    _arrow(ax, (1.2, 2.3), (3.6, 1.5), color=ORANGE, lw=1.1)
    _arrow(ax, (4.0, 2.3), (5.2, 1.5), color=ORANGE, lw=1.1)
    _arrow(ax, (7.0, 2.3), (6.8, 1.5), color=ORANGE, lw=1.1)

    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def draw_search_blend(path: Path) -> None:
    """Sơ đồ 2: 4 yếu tố xếp hạng + cách chặn từ khoá vô nghĩa."""
    fig, ax = plt.subplots(figsize=(10.5, 5.6))
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 5.6)
    ax.axis("off")

    # 4 yếu tố xếp hạng
    srcs = [
        ("Khớp đúng tên", "quan trọng nhất —\ngõ đúng tên phải lên đầu", BLUE),
        ("Hiểu ý nghĩa (AI)", "hiểu \"đồ ăn ngon\"\nlà muốn gì", GREEN),
        ("Hợp sở thích cá nhân", "tái dùng hệ gợi ý\nsản phẩm sẵn có", ORANGE),
        ("Độ phổ biến", "chỉ để phân định\nkhi các yếu tố trên ngang nhau", GRAY),
    ]
    for i, (name, note, color) in enumerate(srcs):
        x = 0.3 + i * 2.6
        _box(ax, (x, 4.1), 2.3, 1.1, name, color, fs=9.5)
        ax.text(x + 1.15, 3.75, note, ha="center", fontsize=8, color=color)
        _arrow(ax, (x + 1.15, 3.5), (4.6 + (i - 1.5) * 0.5, 2.9), color=color, lw=1.2)

    _box(ax, (2.9, 1.9), 4.6, 1.0,
         "Cộng điểm từ 4 yếu tố trên (mỗi yếu tố\n1 mức độ quan trọng khác nhau) cho mỗi sản phẩm", BLUE, fs=8.8)

    # ngưỡng chặn từ khoá vô nghĩa
    _box(ax, (7.9, 1.9), 2.3, 1.0, "Nếu AI không đủ\nchắc chắn về từ khoá\n→ bỏ qua phần AI", RED, fs=9)
    _arrow(ax, (7.9, 2.4), (7.55, 2.4), color=RED, ls=(0, (4, 3)))

    # 3 ví dụ minh hoạ
    ax.text(1.8, 1.15, "\"coca cola\" → khớp tên thắng:\nsản phẩm đúng tên lên đầu,\nAI chỉ bổ sung phía sau",
            ha="center", fontsize=8.5, color=BLUE, style="italic")
    ax.text(5.2, 1.15, "\"đồ ăn ngon\" → không khớp tên nào:\nAI + sở thích cá nhân quyết định,\nmón hợp gu khách lên đầu",
            ha="center", fontsize=8.5, color=GREEN, style="italic")
    ax.text(8.7, 1.15, "\"xzqw vbnk\" → không có gì liên quan:\ntrả \"không tìm thấy\",\nkhông gợi bừa",
            ha="center", fontsize=8.5, color=RED, style="italic")
    _arrow(ax, (3.3, 1.9), (2.4, 1.55), color=BLUE, lw=1.0)
    _arrow(ax, (5.2, 1.9), (5.2, 1.55), color=GREEN, lw=1.0)
    _arrow(ax, (9.0, 1.9), (8.8, 1.55), color=RED, lw=1.0)

    ax.text(5.25, 0.3,
            "Khớp đúng tên luôn thắng AI; cá nhân hoá chỉ xếp lại thứ tự TRONG nhóm liên quan — "
            "không đưa sản phẩm không liên quan lên đầu, không vượt qua bộ lọc.",
            ha="center", fontsize=9, color="#333", style="italic")

    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


# ---------------------------------------------------------------- nội dung

def build(d):
    IMG_PIPE = ASSETS / "img_search_pipeline.png"
    IMG_BLEND = ASSETS / "img_search_blend.png"

    title(d, "Tìm kiếm thông minh (Smart Search)")
    p(d, "Nâng cấp tìm kiếm sản phẩm để hiểu đúng ý khách hàng thay vì chỉ so khớp tên, "
         "đồng thời ưu tiên sản phẩm hợp sở thích từng người. Tài liệu chốt ngày 11/07/2026 — "
         "cả 3 giai đoạn (A, B, C) đã hoàn thành và kiểm thử xong; phần còn lại chỉ là theo dõi "
         "vận hành. Tài liệu tách riêng khỏi AI_Recommendation_Roadmap.docx (roadmap hệ gợi ý "
         "sản phẩm, đã đóng ở Phase 3).")

    # ============================================================ PHẦN I
    h1(d, "PHẦN I — HIỆN TRẠNG & VẤN ĐỀ")

    h2(d, "1. Cách tìm kiếm hiện tại")
    bullet(d, "Việc \"hiểu\" từ khoá chỉ diễn ra ở giao diện: tách từng từ, bỏ dấu, rồi tìm sản phẩm "
              "có tên chứa đúng các từ đó.")
    bullet(d, "Máy chủ chỉ tìm sản phẩm có tên \"chứa chuỗi ký tự\" giống từ khoá — không có chỉ mục "
              "tìm kiếm, không hiểu ý nghĩa câu chữ.")
    bullet(d, "Sắp xếp mặc định không có khái niệm \"mức độ liên quan\" — chỉ theo tên, giá, đánh giá "
              "hoặc thứ tự tạo sản phẩm.")
    bullet(d, "Phần mô tả chi tiết của sản phẩm chưa từng được dùng để tìm kiếm.")
    bullet(d, "Lịch sử các lượt tìm kiếm của khách đã được lưu từ trước nhưng chưa ai khai thác.")

    h2(d, "2. Vấn đề cần giải quyết")
    num(d, "Khách tìm theo NHU CẦU (\"đồ ăn ngon\", \"đồ sấy\"...) chứ không gõ đúng tên sản phẩm — "
           "hiện các tìm kiếm này trả về 0 kết quả.")
    num(d, "Trong số các sản phẩm phù hợp, cần ưu tiên hiện lên trước những sản phẩm hợp sở thích "
           "riêng của từng khách (giống cách Shopee làm), miễn vẫn đúng bộ lọc và từ khoá.")
    p(d, "Hướng đã chọn: dùng công nghệ AI hiểu ngôn ngữ tự nhiên thật sự, không dùng danh sách "
         "từ khoá gán sẵn thủ công.")

    h2(d, "3. Những ràng buộc phải tuân theo")
    bullet(d, "Chữ tiếng Việt có dấu gửi qua đường dẫn URL dễ bị lỗi (bug cũ đã biết của hệ thống) "
              "→ từ khoá tìm kiếm phải gửi qua nội dung yêu cầu, không qua URL.")
    bullet(d, "Mỗi lần gọi sang dịch vụ AI chỉ được chờ tối đa 2–2,5 giây, không được nới thời gian "
              "chờ — để trang không bị treo nếu AI gặp sự cố.")
    bullet(d, "Trước khi dùng thư viện AI mới phải thử cài đặt trước, vì từng có thư viện không cài "
              "được trên máy Windows đang dùng.")
    bullet(d, "Mọi API dành cho quản trị viên phải khai rõ quyền truy cập cho từng loại yêu cầu "
              "(GET/POST tách riêng) — từng suýt để lộ 1 API cho người dùng thường.")
    bullet(d, "Các điều kiện lọc cứng (còn hàng, đúng danh mục, đúng khoảng giá...) luôn phải được "
              "tôn trọng tuyệt đối; AI chỉ được quyền sắp xếp lại thứ tự, không được thêm sản phẩm "
              "ngoài phạm vi đã lọc.")

    # ============================================================ PHẦN II
    h1(d, "PHẦN II — QUYẾT ĐỊNH KIẾN TRÚC")

    h2(d, "1. Công nghệ hiểu ngôn ngữ")
    p(d, "Chọn 1 mô hình AI nhỏ gọn (multilingual-e5-small), hiểu tốt tiếng Việt và chạy được ngay "
         "trên máy chủ hiện có mà không cần phần cứng đặc biệt.")
    data_table(d,
        ["Mức độ", "Cách chạy", "Khi nào dùng"],
        [
            ["Chính", "Chạy mô hình AI nhẹ trực tiếp trên máy chủ", "Mặc định, luôn ưu tiên dùng"],
            ["Dự phòng 1", "Chạy qua thư viện AI đầy đủ hơn (nặng hơn)", "Chỉ dùng nếu cách chính gặp lỗi cài đặt"],
            ["Dự phòng 2", "So khớp từ khoá kiểu truyền thống (không dùng AI)", "Luôn có sẵn — đảm bảo tìm kiếm không bao giờ ngừng hoạt động"],
        ])
    p(d, "Có thể chuyển đổi giữa các mức độ qua cấu hình, không cần sửa code.")
    p(d, "Lưu ý kỹ thuật quan trọng: câu hỏi của khách và mô tả sản phẩm phải được đánh dấu khác "
         "nhau trước khi đưa vào mô hình AI — bỏ qua bước này thì chất lượng kết quả giảm mạnh mà "
         "không có cảnh báo lỗi nào, rất khó phát hiện nếu không kiểm tra kỹ.")

    h2(d, "2. Ai quyết định điều kiện lọc, ai xếp hạng")
    picture(d, IMG_PIPE, "Sơ đồ 1 — Luồng xử lý 1 lượt tìm kiếm, có 3 lớp dự phòng khi có sự cố.")
    bullet(d, "Khách gõ từ khoá → hệ thống lấy trước danh sách sản phẩm ĐÚNG điều kiện lọc (còn hàng, "
              "đúng danh mục, giá...).")
    bullet(d, "Trong đúng danh sách đó, AI xếp hạng theo mức độ liên quan và sở thích khách hàng.")
    bullet(d, "Kết quả được phân trang và hiển thị với giá luôn lấy mới nhất từ hệ thống.")
    bullet(d, "Sản phẩm mới thêm gần đây (AI chưa kịp \"học\") vẫn xuất hiện được nhờ vẫn được so "
              "khớp tên bình thường.")
    bullet(d, "Nếu bất kỳ bước nào lỗi, hệ thống tự động quay về cách tìm kiếm cũ (so khớp tên) — "
              "khách không bao giờ thấy lỗi.")
    bullet(d, "Nguyên tắc quan trọng nhất: AI không bao giờ được thêm sản phẩm ngoài danh sách đã "
              "lọc sẵn — đảm bảo bộ lọc luôn đúng tuyệt đối.")

    h2(d, "3. Cách tính điểm xếp hạng")
    picture(d, IMG_BLEND, "Sơ đồ 2 — 4 yếu tố được cộng lại để xếp hạng kết quả.")
    p(d, "4 yếu tố được cộng lại theo mức độ quan trọng khác nhau:")
    bullet(d, "Khớp đúng tên sản phẩm — quan trọng nhất, ai gõ đúng tên phải thấy sản phẩm đó lên đầu.")
    bullet(d, "Hiểu ý nghĩa — AI hiểu ý khách muốn tìm gì dù không gõ đúng tên.")
    bullet(d, "Hợp sở thích cá nhân — tái sử dụng hệ thống gợi ý sản phẩm AI đã có sẵn.")
    bullet(d, "Độ phổ biến — chỉ dùng để phân định khi các yếu tố trên gần như ngang nhau.")
    bullet(d, "Khớp đúng tên luôn thắng các yếu tố khác. Cá nhân hoá chỉ xếp lại thứ tự bên trong "
              "nhóm sản phẩm đã liên quan, không đưa sản phẩm không liên quan lên đầu và không "
              "vượt qua bộ lọc.")
    bullet(d, "Tìm kiếm khác gợi ý sản phẩm ở chỗ: không loại các sản phẩm khách đã từng xem/mua "
              "khỏi kết quả — vì khách tìm kiếm thường muốn tìm lại đúng thứ đã từng thấy.")

    h2(d, "4. Tránh trả kết quả linh tinh cho từ khoá vô nghĩa")
    p(d, "Đặt ra một \"ngưỡng tin cậy\": nếu AI không đủ chắc chắn có sản phẩm nào thật sự liên quan "
         "tới từ khoá, hệ thống sẽ bỏ qua phần gợi ý của AI, chỉ dùng kết quả khớp tên (nếu có) hoặc "
         "báo \"không tìm thấy\".")
    p(d, "Đã kiểm tra trên toàn bộ catalog thật (236 sản phẩm) với 15 từ khoá có nhu cầu thật và "
         "5 từ khoá vô nghĩa: hệ thống phân biệt đúng 100% cả hai nhóm, không chặn nhầm từ khoá "
         "thật nào và không để lọt từ khoá vô nghĩa nào.")
    p(d, "Hạn chế đã biết: nếu khách tìm loại hàng cửa hàng hoàn toàn không bán, hệ thống vẫn có "
         "thể trả về sản phẩm \"gần giống nhất\" — đây là giới hạn tự nhiên của cách tiếp cận này, "
         "không thể sửa chỉ bằng cách chỉnh ngưỡng.")

    h2(d, "5. Không bao giờ để trang tìm kiếm bị lỗi vì AI")
    data_table(d,
        ["Tình huống", "Hệ thống xử lý thế nào"],
        [
            ["AI gặp trục trặc nhẹ", "Tự chuyển sang cách xử lý đơn giản hơn — khách không nhận ra gì khác."],
            ["Dịch vụ AI ngừng hoạt động hoặc quá chậm", "Tự động quay về cách tìm kiếm khớp tên như trước khi nâng cấp."],
            ["Từ khoá không khớp gì cả", "Báo rõ \"không tìm thấy sản phẩm\", không cố gợi ý bừa."],
            ["Giao diện gọi API mới bị lỗi", "Tự động gọi lại API tìm kiếm cũ, khách không thấy gián đoạn."],
            ["Khách chọn sắp xếp theo giá/đánh giá", "Vẫn áp dụng đúng trong nhóm kết quả đã xác định là liên quan."],
        ])
    p(d, "Về tốc độ: đã đo thực tế toàn bộ quy trình, luôn nằm trong giới hạn thời gian chờ cho phép "
         "(2,5 giây) — với quy mô sản phẩm hiện tại, việc xếp hạng bằng AI chỉ tốn thêm vài chục "
         "mili-giây so với tìm kiếm cũ.")

    # ============================================================ PHẦN III
    h1(d, "PHẦN III — 3 GIAI ĐOẠN TRIỂN KHAI")

    # ---------------- Phase A
    h2(d, "Giai đoạn A — Xây nền tảng AI (đã hoàn thành 11/07/2026)")
    p(d, "Mục tiêu: xây phần \"bộ não\" AI phía sau, chưa ai nhìn thấy trên giao diện — an toàn "
         "tuyệt đối, không ảnh hưởng người dùng đang dùng hệ thống.")
    p(d, "Kết quả: đã hoàn thành và kiểm thử đầy đủ. Toàn bộ 15 bài kiểm tra tự động đều đạt. "
         "Kiểm tra trên dữ liệu thật (236 sản phẩm): tìm \"đồ sấy\" trả về đúng 10/10 sản phẩm "
         "trái cây sấy; từ khoá vô nghĩa bị nhận diện và loại bỏ đúng; sản phẩm nằm ngoài bộ lọc "
         "không bao giờ lọt vào kết quả.")
    bullet(d, "Bài học quan trọng: mọi thư viện AI mới đều được thử cài đặt trước trên máy thật — "
              "tránh lặp lại sự cố từng gặp với 1 thư viện khác không cài được trên Windows.")
    bullet(d, "Mô tả sản phẩm đưa cho AI phải kèm cả tên danh mục, không chỉ tên sản phẩm — nếu chỉ "
              "có tên trần, AI xếp hạng sai (VD \"mít sấy\" từng bị xếp thấp hơn \"nước rửa chén\" "
              "khi tìm \"đồ sấy khô\").")

    # ---------------- Phase B
    h2(d, "Giai đoạn B — Kết nối vào hệ thống thật (đã hoàn thành 11/07/2026)")
    p(d, "Mục tiêu: khách thật gõ \"đồ ăn ngon\" phải ra kết quả; kết quả mặc định xếp theo mức độ "
         "liên quan có cá nhân hoá; nếu AI ngừng hoạt động, tìm kiếm vẫn chạy bình thường.")
    p(d, "Kết quả: đã hoàn thành và kiểm thử đầy đủ, cả kiểm tra tự động lẫn thao tác thực tế trên "
         "trình duyệt (9 kịch bản, đều đạt) — bao gồm việc tắt hẳn dịch vụ AI để kiểm tra tìm kiếm "
         "vẫn hoạt động bình thường (chuyển sang cách cũ trong chưa tới 50 mili-giây, tự khôi phục "
         "khi AI bật lại, không cần khởi động lại hệ thống chính).")
    bullet(d, "Phát hiện và đã sửa 1 lỗi có sẵn từ trước, không liên quan tính năng mới: trang bị "
              "lỗi khi tính khoảng giá cho từ khoá không khớp sản phẩm nào theo tên — trước đây "
              "không ai gặp vì các từ khoá kiểu này luôn trả 0 kết quả nên không ai đi tới đoạn "
              "code đó.")
    bullet(d, "Hạn chế đã biết: từ khoá gõ KHÔNG dấu (VD \"sua tuoi\") chưa được AI hiểu tốt bằng "
              "bản có dấu — đã ghi nhận để xử lý ở giai đoạn sau.")

    # ---------------- Phase C
    h2(d, "Giai đoạn C — Đo lường & cải thiện (đã hoàn thành 11/07/2026)")
    p(d, "Mục tiêu: biết được tính năng mới có thực sự tốt hơn không, gợi ý thêm từ khoá cho khách, "
         "và xử lý luôn hạn chế \"từ khoá không dấu\" ở Giai đoạn B.")
    p(d, "Kết quả: đã hoàn thành và kiểm thử đầy đủ.")
    bullet(d, "Thêm 1 khu vực \"Chất lượng tìm kiếm\" vào trang thống kê dành cho quản trị viên: "
              "số lượt tìm kiếm, tỉ lệ 0 kết quả, và đặc biệt là \"số lượt AI cứu được\" — tức các "
              "lượt tìm kiếm mà cách cũ chắc chắn trả 0 kết quả nhưng AI vẫn tìm ra sản phẩm phù hợp.")
    bullet(d, "Thêm gợi ý \"Mọi người cũng tìm\" ngay khi khách đang gõ, lấy từ lịch sử tìm kiếm "
              "thật của cộng đồng.")
    bullet(d, "Đã xử lý luôn hạn chế \"từ khoá không dấu\": hệ thống tự tra trong lịch sử xem có ai "
              "từng gõ CÙNG từ khoá đó NHƯNG CÓ DẤU và tìm ra kết quả tốt không, nếu có thì dùng "
              "bản có dấu để AI xử lý. Kết quả: \"sua tuoi\" trước đây chỉ ra 12 sản phẩm, giờ ra "
              "đủ 100 sản phẩm giống hệt khi gõ có dấu.")
    bullet(d, "Bài học mới phát hiện khi kiểm thử: việc so sánh chữ có dấu và không dấu trong cơ sở "
              "dữ liệu (MySQL) mặc định coi chúng là GIỐNG NHAU — khiến 1 đoạn logic ban đầu tưởng "
              "đúng nhưng thực ra luôn âm thầm trả về rỗng. Đã sửa bằng cách so sánh chính xác "
              "từng ký tự thay vì so sánh mặc định.")

    # ============================================================ PHẦN IV
    h1(d, "PHẦN IV — DANH MỤC FILE & CẤU HÌNH (tham chiếu cho lập trình viên)")

    h2(d, "1. Danh mục file đã tạo/sửa theo từng phần hệ thống")
    data_table(d,
        ["Phần hệ thống", "File mới", "File đã sửa"],
        [
            ["Python (recommendation-service/)",
             "app/search/{encoder, lexical, rank, embeddings}.py; scripts/check_embedding_env.py; scripts/calibrate_search.py; tests/test_search_rank.py",
             "app/config.py; app/store.py; app/trainer.py; app/main.py; app/candidates/content_based.py; requirements.txt"],
            ["Java (server/.../webnongsan/)",
             "service/SmartSearchService.java; domain/request/SmartSearchRequestDTO.java; domain/response/recommendation/PythonSearchRankResponse.java",
             "controller/ProductController.java; repository/ProductRepository.java; config/SecurityConfiguration.java; application.properties; service/EventTrackingService.java"],
            ["Frontend (client/src/)",
             "—",
             "apis/product.js; apis/recommendation.js; pages/guest/Product.jsx; components/common/SearchBar.jsx; pages/admin/RecommendationMetrics.jsx; utils/constants.jsx"],
            ["Khác",
             "—",
             "Cột mới trong bảng search_logs (tự tạo qua ddl-auto)"],
        ])

    h2(d, "2. Các cấu hình có thể chỉnh")
    p(d, "Toàn bộ ngưỡng và trọng số bên dưới nằm trong file cấu hình (.env), chỉnh trực tiếp "
         "không cần sửa code:")
    code_box(d, """# ===== Python recommendation-service (.env) =====
search_embedding_backend=auto        # auto | onnx | torch | tfidf | off
search_sem_min_sim=0.80              # ngưỡng tin cậy tối thiểu để nhận 1 sản phẩm
search_sem_top1_gate=0.82            # ngưỡng để coi từ khoá là "có ý nghĩa"
w_search_lexical=1.0                 # mức độ quan trọng: khớp đúng tên
w_search_semantic=0.8                # mức độ quan trọng: AI hiểu ý nghĩa
w_search_personal=0.5                # mức độ quan trọng: hợp sở thích cá nhân
w_search_popularity=0.15             # mức độ quan trọng: độ phổ biến

# ===== Java (application.properties) =====
recommendation.search.enabled=true   # bật/tắt tính năng AI, không cần sửa code
recommendation.search.max-candidates=2000
recommendation.search.rank-limit=300""")

    h2(d, "3. Nguyên tắc không được phá vỡ")
    num(d, "Không được để bất kỳ sự cố nào của AI làm hỏng trang tìm kiếm — tệ nhất chỉ là quay "
           "về cách tìm kiếm cũ.")
    num(d, "Điều kiện lọc luôn được tôn trọng tuyệt đối, AI không được vượt qua.")
    num(d, "Từ khoá có dấu chỉ gửi qua nội dung yêu cầu, không qua URL; thời gian chờ dịch vụ AI "
           "không được nới ra.")
    num(d, "Thư viện mới phải thử cài đặt thành công trước khi viết code; API quản trị phải khai "
           "quyền rõ theo từng loại yêu cầu.")
    num(d, "Mọi ngưỡng và trọng số đều chỉnh qua cấu hình, và phải kiểm tra bằng dữ liệu thật "
           "trước khi tin tưởng.")


def main() -> None:
    draw_search_pipeline(ASSETS / "img_search_pipeline.png")
    draw_search_blend(ASSETS / "img_search_blend.png")

    d = Document()
    build(d)
    d.save(str(DOCX))
    print(f"OK: {DOCX}")


if __name__ == "__main__":
    main()
