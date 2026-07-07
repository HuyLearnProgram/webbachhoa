package com.app.webnongsan.service;


import com.app.webnongsan.config.VNPAYConfig;
import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.response.payment.PaymentDTO;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.util.VNPayUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final VNPAYConfig vnPayConfig;
    private final OrderRepository orderRepository;

    public PaymentDTO.VNPayResponse createVnPayPayment(HttpServletRequest request) throws ResourceInvalidException {
        long amount = Integer.parseInt(request.getParameter("amount")) * 100L;
        String bankCode = request.getParameter("bankCode");
        String orderIdParam = request.getParameter("orderId");

        Map<String, String> vnpParamsMap = vnPayConfig.getVNPayConfig();
        vnpParamsMap.put("vnp_Amount", String.valueOf(amount));
        if (bankCode != null && !bankCode.isEmpty()) {
            vnpParamsMap.put("vnp_BankCode", bankCode);
        }
        vnpParamsMap.put("vnp_IpAddr", VNPayUtil.getIpAddress(request));

        if (orderIdParam != null && !orderIdParam.isEmpty()) {
            Long orderId = Long.parseLong(orderIdParam);
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceInvalidException("Đơn hàng không tồn tại"));
            // Gắn orderId vào vnp_TxnRef (kèm timestamp để đảm bảo duy nhất nếu khách thử lại thanh toán)
            // để callback từ VNPay có thể đối chiếu ngược lại đúng đơn hàng này.
            String vnpTxnRef = orderId + "_" + System.currentTimeMillis();
            vnpParamsMap.put("vnp_TxnRef", vnpTxnRef);
            vnpParamsMap.put("vnp_OrderInfo", "Thanh toan don hang:" + orderId);
            order.setVnpTxnRef(vnpTxnRef);
            orderRepository.save(order);
        } else {
            // Không có orderId (không nên xảy ra với luồng checkout thực tế) - vẫn tạo được link nhưng sẽ không đối chiếu được ở callback.
            vnpParamsMap.put("vnp_TxnRef", VNPayUtil.getRandomNumber(8));
            vnpParamsMap.put("vnp_OrderInfo", "Thanh toan don hang:" + VNPayUtil.getRandomNumber(8));
        }

        //build query url
        String queryUrl = VNPayUtil.getPaymentURL(vnpParamsMap, true);
        String hashData = VNPayUtil.getPaymentURL(vnpParamsMap, false);
        String vnpSecureHash = VNPayUtil.hmacSHA512(vnPayConfig.getSecretKey(), hashData);
        queryUrl += "&vnp_SecureHash=" + vnpSecureHash;
        String paymentUrl = vnPayConfig.getVnp_PayUrl() + "?" + queryUrl;
        return PaymentDTO.VNPayResponse.builder()
                .code("ok")
                .message("success")
                .paymentUrl(paymentUrl).build();
    }

    /**
     * Verify chữ ký VNPay gửi về ở callback, đối chiếu đúng Order qua vnp_TxnRef,
     * kiểm tra số tiền khớp để chống giả mạo, rồi cập nhật paymentStatus tương ứng.
     * @return true nếu thanh toán được xác nhận thành công (PAID), false nếu thất bại/không hợp lệ.
     */
    public boolean confirmVnPayCallback(Map<String, String> params) {
        Map<String, String> fields = new HashMap<>(params);
        String vnpSecureHash = fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        if (vnpSecureHash == null) {
            return false;
        }

        String hashData = VNPayUtil.getPaymentURL(fields, false);
        String myHash = VNPayUtil.hmacSHA512(vnPayConfig.getSecretKey(), hashData);
        if (!myHash.equalsIgnoreCase(vnpSecureHash)) {
            // Chữ ký không khớp - có thể bị giả mạo, không tin bất kỳ field nào trong request này.
            return false;
        }

        String vnpTxnRef = fields.get("vnp_TxnRef");
        Optional<Order> orderOpt = vnpTxnRef != null ? orderRepository.findByVnpTxnRef(vnpTxnRef) : Optional.empty();
        if (orderOpt.isEmpty()) {
            return false;
        }
        Order order = orderOpt.get();

        String responseCode = fields.get("vnp_ResponseCode");
        long vnpAmount;
        try {
            vnpAmount = Long.parseLong(fields.getOrDefault("vnp_Amount", "0"));
        } catch (NumberFormatException e) {
            vnpAmount = -1;
        }
        boolean amountMatches = vnpAmount == Math.round(order.getTotal_price() * 100);

        if ("00".equals(responseCode) && amountMatches) {
            order.setPaymentStatus("PAID");
            order.setTransactionNo(fields.get("vnp_TransactionNo"));
            order.setPaidAt(Instant.now());
            orderRepository.save(order);
            return true;
        } else {
            order.setPaymentStatus("PAYMENT_FAILED");
            order.setStatus(3);
            orderRepository.save(order);
            return false;
        }
    }
}
