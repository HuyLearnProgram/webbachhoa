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
import org.springframework.mail.MailException;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
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
    private final MailSender mailSender;
    private final JavaMailSender javaMailSender;
    private final SpringTemplateEngine templateEngine;
    private final OrderRepository orderRepository;
    private final OrderDetailService orderDetailService;
    private final OrderDetailRepository orderDetailRepository;

    public void sendMail(String email){
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(email);
        msg.setSubject("Testing from Spring Boot");
        msg.setText("Hello World from Spring Boot Email");
        this.mailSender.send(msg);
    }

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
            System.out.println("ERROR SEND EMAIL: " + e);
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

    private String formatCurrency(Double amount) {
        Locale locale = new Locale("vi", "VN");
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(locale);
        return currencyFormatter.format(amount);
    }
}
