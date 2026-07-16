package com.app.webnongsan.service;

import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.OrderDetail;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.repository.OrderDetailRepository;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@AllArgsConstructor
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender javaMailSender;
    private final SpringTemplateEngine templateEngine;
    private final OrderRepository orderRepository;
    private final OrderDetailService orderDetailService;
    private final OrderDetailRepository orderDetailRepository;

    public void sendEmailSync(String to, String subject, String content, boolean isMultipart,
                              boolean isHtml) {
        // Prepare message using a Spring helper
        MimeMessage mimeMessage = this.javaMailSender.createMimeMessage();
        try {
            MimeMessageHelper message = new MimeMessageHelper(mimeMessage,
                    isMultipart, StandardCharsets.UTF_8.name());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content, isHtml);
            this.javaMailSender.send(mimeMessage);
        } catch (MailException | MessagingException e) {
            log.error("ERROR SEND EMAIL: {}", e.getMessage(), e);
        }
    }

    @Async
    public void sendEmailFromTemplateSync(String to, String subject, String
            templateName, String username, Object o) {
        Context context = new Context();
        context.setVariable("NAME", username);
        context.setVariable("TOKEN", o);
        String content = this.templateEngine.process(templateName, context);
        this.sendEmailSync(to, subject, content, false, true);
    }
    // Gửi email xác nhận đơn hàng — luôn đọc lại Order/OrderDetail đã lưu trong DB (không tin dữ liệu
    // client tự gửi lên), để email luôn khớp đúng khuyến mãi/voucher đã chốt tại thời điểm đặt hàng,
    // kể cả sau khi khuyến mãi trên Product đã hết hạn/đổi khác.
    // Đọc thẳng Order entity qua OrderRepository (không qua OrderService) để tránh vòng phụ thuộc:
    // UserService -> EmailService -> OrderService -> UserService.
    // @Transactional bắt buộc phải có: method chạy trên thread @Async riêng (không có session của
    // request gốc), trong khi Order.user/Order.voucher/OrderDetail.product đều LAZY — thiếu annotation
    // này sẽ ném LazyInitializationException ngay khi đọc order.getUser()/getVoucher(), nhưng vì method
    // trả void nên lỗi chỉ bị log ra console, controller vẫn trả 200 "gửi email thành công" như bình
    // thường — im lặng gửi thất bại, rất khó phát hiện nếu không đọc log server.
    @Async
    @Transactional(readOnly = true)
    public void sendOrderConfirmationEmail(Long orderId) throws ResourceInvalidException {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceInvalidException("Đơn hàng id=" + orderId + " không tồn tại"));
        Voucher voucher = order.getVoucher();

        List<OrderDetail> details = orderDetailRepository.findByOrderId(orderId);
        List<OrderDetailDTO> items = details.stream()
                .map(orderDetailService::convertToOrderDetailDTO)
                .toList();

        double subtotal = 0;
        for (OrderDetailDTO item : items) {
            double lineTotal = (item.getLineTotal() != null && item.getLineTotal() > 0)
                    ? item.getLineTotal() : item.getUnit_price() * item.getQuantity();
            subtotal += lineTotal;

            item.setFormattedPrice(formatCurrency(item.getUnit_price()));
            item.setFormattedLineTotal(formatCurrency(lineTotal));
            if (item.getOriginalPrice() != null) {
                item.setFormattedOriginalPrice(formatCurrency(item.getOriginalPrice()));
            }
            if (item.getPromoBundlePrice() != null) {
                item.setFormattedPromoBundlePrice(formatCurrency(item.getPromoBundlePrice()));
            }
        }

        // Chênh lệch subtotal (tổng lineTotal, snapshot đúng lúc đặt hàng) với total_price thật đã lưu
        // chính là số tiền voucher đã giảm — tránh tính lại công thức PERCENT/FIXED ở đây, luôn khớp
        // tuyệt đối với số tiền khách thực sự đã trả.
        Double voucherDiscountAmount = voucher != null ? subtotal - order.getTotal_price() : null;

        LocalDateTime currentDateTime = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

        Context context = new Context();
        context.setVariable("customerName", order.getUser().getName());
        context.setVariable("customerAddress", order.getAddress());
        context.setVariable("customerPhone", order.getPhone());
        context.setVariable("customerCountry", "Việt Nam");
        context.setVariable("paymentMethod", "COD".equalsIgnoreCase(order.getPaymentMethod())
                ? "Thanh toán khi nhận hàng (COD)" : "Thanh toán online (VNPay)");
        context.setVariable("invoiceDate", currentDateTime.format(formatter));
        context.setVariable("orderId", order.getId());
        context.setVariable("items", items);
        context.setVariable("formattedSubtotal", formatCurrency(subtotal));
        context.setVariable("voucherCode", voucher != null ? voucher.getCode() : null);
        context.setVariable("formattedVoucherDiscount",
                voucherDiscountAmount != null ? formatCurrency(voucherDiscountAmount) : null);
        context.setVariable("formattedTotalPrice", formatCurrency(order.getTotal_price()));

        String content = this.templateEngine.process("checkout", context);
        this.sendEmailSync(order.getUser().getEmail(), "Xác nhận đơn hàng #" + order.getId(), content, false, true);
    }
    @Async
    public void sendEmailFromTemplateSyncUserUpdate(String to, String username, String templateName,
            String oldName, String newName, String oldPhone, String newPhone,
            String oldAddress, String newAddress, boolean statusChanged, boolean newStatusActive,
            String lockReason) {
        Context context = new Context();
        context.setVariable("NAME", username);
        context.setVariable("NAME_CHANGED", !Objects.equals(oldName, newName));
        context.setVariable("OLD_NAME", oldName);
        context.setVariable("NEW_NAME", newName);
        context.setVariable("PHONE_CHANGED", !Objects.equals(oldPhone, newPhone));
        context.setVariable("OLD_PHONE", oldPhone);
        context.setVariable("NEW_PHONE", newPhone);
        context.setVariable("ADDRESS_CHANGED", !Objects.equals(oldAddress, newAddress));
        context.setVariable("OLD_ADDRESS", oldAddress);
        context.setVariable("NEW_ADDRESS", newAddress);
        context.setVariable("STATUS_CHANGED", statusChanged);
        context.setVariable("NEW_STATUS_ACTIVE", newStatusActive);
        context.setVariable("LOCK_REASON", lockReason != null && !lockReason.isBlank() ? lockReason : null);
        String content = this.templateEngine.process(templateName, context);
        this.sendEmailSync(to, "Thông tin tài khoản của bạn vừa được cập nhật", content, false, true);
    }

    // Template email chung cho MỌI loại trao voucher tự động (welcome/first-order/milestone/
    // cart-recovery/birthday/win-back/referral/lucky-draw) — tránh 8 template gần giống nhau,
    // tham số hoá qua reasonText (câu giải thích lý do trao, tự nhiên theo từng loại).
    @Async
    public void sendVoucherGrantedEmail(String to, String username, String reasonText, Voucher voucher) {
        Context context = new Context();
        context.setVariable("NAME", username);
        context.setVariable("REASON_TEXT", reasonText);
        context.setVariable("CODE", voucher.getCode());
        String discountText = voucher.getType() == Voucher.VoucherType.PERCENT
                ? "Giảm " + formatPercent(voucher.getDiscountValue()) + "%"
                : "Giảm " + formatCurrency(voucher.getDiscountValue());
        context.setVariable("DISCOUNT_TEXT", discountText);
        context.setVariable("MAX_DISCOUNT_TEXT",
                voucher.getType() == Voucher.VoucherType.PERCENT && voucher.getMaxDiscountAmount() != null
                        ? "(tối đa " + formatCurrency(voucher.getMaxDiscountAmount()) + ")" : null);
        context.setVariable("MIN_ORDER_TEXT",
                voucher.getMinimumOrderAmount() != null && voucher.getMinimumOrderAmount() > 0
                        ? "Áp dụng cho đơn hàng từ " + formatCurrency(voucher.getMinimumOrderAmount()) : null);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(java.time.ZoneId.systemDefault());
        context.setVariable("EXPIRY_TEXT", formatter.format(voucher.getEndDate()));
        String content = this.templateEngine.process("voucherGranted", context);
        this.sendEmailSync(to, "Bạn vừa nhận được 1 voucher mới!", content, false, true);
    }

    // Cart Recovery — thông báo 1 sản phẩm trong giỏ hàng khách vừa được giảm giá CÁ NHÂN (do để quên
    // >=48h), chỉ áp dụng trong khung giờ Flash Sale (12h-14h, 20h-22h), hết hạn 22h00 CÙNG NGÀY.
    @Async
    public void sendCartRecoveryDiscountEmail(String to, String username, String productName,
                                                double discountPercent, double originalPrice, double discountedPrice,
                                                java.time.Instant expiresAt) {
        Context context = new Context();
        context.setVariable("NAME", username);
        context.setVariable("PRODUCT_NAME", productName);
        context.setVariable("DISCOUNT_TEXT", "Giảm " + formatPercent(discountPercent) + "%");
        context.setVariable("ORIGINAL_PRICE_TEXT", formatCurrency(originalPrice));
        context.setVariable("DISCOUNTED_PRICE_TEXT", formatCurrency(discountedPrice));
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(java.time.ZoneId.systemDefault());
        context.setVariable("EXPIRY_TEXT", formatter.format(expiresAt));
        String content = this.templateEngine.process("cartRecoveryFlashSale", context);
        this.sendEmailSync(to, "Sản phẩm trong giỏ hàng của bạn đang được giảm giá!", content, false, true);
    }

    private String formatPercent(Double value) {
        if (value == null) return "";
        return value == Math.floor(value) ? String.valueOf(value.intValue()) : String.valueOf(value);
    }

    private String formatCurrency(Double amount) {
        Locale locale = new Locale("vi", "VN");
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(locale);
        return currencyFormatter.format(amount);
    }
}
