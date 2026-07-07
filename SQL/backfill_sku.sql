-- Chạy 1 LẦN DUY NHẤT sau khi backend đã restart (Hibernate tự thêm cột sku vào bảng products).
-- Chỉ tác động sản phẩm CŨ (sku đang NULL) - không đụng tới sản phẩm nào đã có SKU thật,
-- dù được gán qua form Add/Edit hay qua import Excel sau này.
--
-- Lý do cần backfill: tính năng Nhập/Xuất Excel dùng sku làm khoá đối chiếu để phân biệt
-- "tạo mới" (sku rỗng/không khớp) và "cập nhật" (sku khớp sản phẩm đã tồn tại). Nếu để sku
-- trống, luồng Xuất -> sửa -> Nhập lại sẽ tạo trùng lặp toàn bộ thay vì cập nhật đúng sản phẩm.
-- Mẫu SKU tự sinh: SP-{id} (vd: SP-1, SP-2...) - chỉ để có khoá đối chiếu, có thể đổi thành
-- mã thật (theo NCC, mã vạch...) sau này qua form Edit, không ảnh hưởng gì đến việc đổi lại.

-- Xem trước sẽ có bao nhiêu dòng bị ảnh hưởng (không bắt buộc, chỉ để kiểm tra trước khi UPDATE thật):
-- SELECT id, sku FROM products WHERE sku IS NULL;

UPDATE products SET sku = CONCAT('SP-', id) WHERE sku IS NULL;
