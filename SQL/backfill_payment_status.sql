-- Chạy 1 LẦN DUY NHẤT sau khi backend đã restart (Hibernate tự thêm cột payment_status/vnp_txn_ref/transaction_no/paid_at vào bảng orders).
-- Chỉ tác động đơn CŨ (payment_status đang NULL) - không đụng tới đơn nào code mới đã tự set paymentStatus
-- đúng thông qua verify callback VNPay/luồng COD (những đơn đó đã chính xác tuyệt đối, không cần xấp xỉ lại).
--
-- Xấp xỉ tốt nhất cho dữ liệu lịch sử không có bằng chứng giao dịch VNPay:
--   - COD: đã giao (status=2) coi như đã thu tiền mặt -> PAID, còn lại -> UNPAID.
--   - VNPAY: chưa bị huỷ thủ công (status<>3) coi như đã thanh toán thành công -> PAID, đã huỷ -> UNPAID.

-- Xem trước sẽ có bao nhiêu dòng bị ảnh hưởng (không bắt buộc, chỉ để kiểm tra trước khi UPDATE thật):
-- SELECT id, payment_method, status, payment_status FROM orders WHERE payment_status IS NULL;

UPDATE orders SET payment_status = 'UNPAID' WHERE payment_status IS NULL AND payment_method = 'COD' AND status <> 2;
UPDATE orders SET payment_status = 'PAID'   WHERE payment_status IS NULL AND payment_method = 'COD' AND status = 2;
UPDATE orders SET payment_status = 'PAID'   WHERE payment_status IS NULL AND payment_method = 'VNPAY' AND status <> 3;
UPDATE orders SET payment_status = 'UNPAID' WHERE payment_status IS NULL AND payment_method = 'VNPAY' AND status = 3;
