-- Migration: đổi ngữ nghĩa "giá gốc" (original_price, giá tham chiếu cao hơn) thành "giá giảm"
-- (discount_price, giá khách THỰC TRẢ khi PRICE_DISCOUNT đang chạy) — xem CLAUDE.md hạng mục
-- "Sửa ngữ nghĩa Giá gốc -> Giá giảm" để biết lý do.
--
-- Trước khi chạy: cột `discount_price` (nullable) đã được Hibernate ddl-auto=update tự thêm khi
-- backend hot-restart với entity Product.java mới — script này CHỈ backfill dữ liệu cũ + xoá cột chết,
-- không tự ALTER ADD COLUMN.
--
-- Ý nghĩa cũ:  price = giá khách thực trả (đã giảm), original_price = giá tham chiếu cao hơn.
-- Ý nghĩa mới: price = giá bán ổn định (không đổi khi bật/tắt khuyến mãi), discount_price = giá khách
--              thực trả khi khuyến mãi đang chạy.
-- => Với các dòng đang PRICE_DISCOUNT hợp lệ: price MỚI = original_price CŨ, discount_price MỚI = price CŨ.

UPDATE products
SET discount_price = price, price = original_price
WHERE promotion_type = 'PRICE_DISCOUNT' AND original_price IS NOT NULL AND original_price > price;

-- Xoá cột cũ — không còn dùng ở bất kỳ đâu trong code sau khi rename (đã grep xác nhận).
ALTER TABLE products DROP COLUMN original_price;
