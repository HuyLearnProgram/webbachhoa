-- One-time backfill: sản phẩm cũ (tạo trước khi có hệ thống khuyến mãi đa loại) có promotion_type = NULL
-- (cột mới thêm qua ddl-auto=update không có DEFAULT ở DB, chỉ Java-side default áp dụng cho entity mới tạo trong JVM).
-- Hậu quả: filter "Khuyến mãi" ở admin Product.jsx chọn "Không khuyến mãi" (promotionType='NONE') không khớp NULL -> gần như mọi sản phẩm biến mất khỏi kết quả lọc.
-- Sản phẩm cũ đã có sẵn originalPrice (giảm giá tĩnh trước đây) được phân loại lại đúng thành PRICE_DISCOUNT, còn lại NONE.
UPDATE products
SET promotion_type = CASE
    WHEN original_price IS NOT NULL AND original_price > price THEN 'PRICE_DISCOUNT'
    ELSE 'NONE'
END
WHERE promotion_type IS NULL;
