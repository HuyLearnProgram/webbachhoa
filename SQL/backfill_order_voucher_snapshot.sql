-- Backfill snapshot voucher cho đơn hàng CŨ (tạo trước khi thêm 4 cột voucher_code/voucher_type/
-- voucher_discount_value/voucher_discount_amount vào bảng orders).
-- Chạy 1 LẦN, thủ công, SAU KHI Hibernate (ddl-auto=update) đã tự thêm 4 cột này vào bảng orders
-- khi backend khởi động với entity Order.java mới. An toàn chạy lại nhiều lần (idempotent).
--
-- Đây là BEST-EFFORT RECONSTRUCTION, không phải dữ liệu gốc.

UPDATE orders o
JOIN vouchers v ON o.voucher_id = v.id
SET o.voucher_code = v.code,
    o.voucher_type = v.type,
    o.voucher_discount_value = v.discount_value
WHERE o.voucher_id IS NOT NULL;

-- Primary: suy voucher_discount_amount từ order_detail khi dữ liệu dòng hàng hợp lệ
-- (subtotal > total_price — lineTotal là tổng tiền từng dòng ĐÃ áp khuyến mãi sản phẩm nhưng
-- CHƯA áp voucher, voucher là giảm giá cấp đơn hàng nên subtotal - total_price = số tiền đã giảm).
UPDATE orders o
JOIN (
    SELECT order_id, SUM(line_total) AS subtotal FROM order_detail GROUP BY order_id
) sub ON sub.order_id = o.id
SET o.voucher_discount_amount = sub.subtotal - o.total_price
WHERE o.voucher_id IS NOT NULL AND sub.subtotal > o.total_price;

-- Fallback: đơn quá cũ tạo trước khi có snapshot khuyến mãi (order_detail.line_total = 0/NULL,
-- nợ kỹ thuật đã ghi trong CLAUDE.md) — không suy được từ line_total, tính trực tiếp từ
-- voucher_type/voucher_discount_value đối chiếu total_price (giá trị SAU khi đã trừ voucher):
-- FIXED: amount = discount_value; PERCENT: before = total_price / (1 - value/100), amount = before - total_price.
UPDATE orders o
SET o.voucher_discount_amount = CASE
    WHEN o.voucher_type = 'FIXED' THEN o.voucher_discount_value
    WHEN o.voucher_type = 'PERCENT' AND o.voucher_discount_value < 100
        THEN o.total_price * o.voucher_discount_value / (100 - o.voucher_discount_value)
    ELSE 0
END
WHERE o.voucher_id IS NOT NULL AND (o.voucher_discount_amount IS NULL OR o.voucher_discount_amount <= 0);
