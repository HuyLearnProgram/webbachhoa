-- One-time backfill: order_detail tạo trước khi có snapshot khuyến mãi (line_total/promotion_type/free_units)
-- có line_total = 0 (DEFAULT của cột mới thêm qua ddl-auto=update), promotion_type = 'NONE', free_units = 0.
-- Các đơn hàng này đều được đặt trước khi hệ thống khuyến mãi đa loại tồn tại, nên xấp xỉ đúng: line_total = unit_price * quantity.
UPDATE order_detail
SET line_total = unit_price * quantity
WHERE line_total IS NULL OR line_total = 0;
