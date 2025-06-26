package com.app.webnongsan.service;

import com.app.webnongsan.domain.response.order.OrderDetailDTO;
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
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@AllArgsConstructor
public class EmailService {
    private final MailSender mailSender;
    private final JavaMailSender javaMailSender;
    private final SpringTemplateEngine templateEngine;

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
    @Async
    public void sendEmailFromTemplateSyncCheckout(String to, String subject, String templateName,
                                                  String username,String address, String phone, String paymentMethod, Double totalPrice, List<OrderDetailDTO> items) {

        String formattedTotalPrice = formatCurrency(totalPrice);
        // Format từng sản phẩm trong danh sách items
        items.forEach(item -> item.setFormattedPrice(formatCurrency(item.getUnit_price())));

        // Lấy thời gian hiện tại và định dạng
        LocalDateTime currentDateTime = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
        String formattedDateTime = currentDateTime.format(formatter);

        Context context = new Context();
        context.setVariable("NAME", username);
        context.setVariable("TOTAL_PRICE", totalPrice);
        context.setVariable("customerName",username);
        context.setVariable("customerAddress",address);
        context.setVariable("customerPhone",phone);
        context.setVariable("customerCountry","Việt Nam");
        context.setVariable("paymentMethod",paymentMethod);
        context.setVariable("invoiceDate",formattedDateTime);
        context.setVariable("items", items);
        String content = this.templateEngine.process(templateName, context);
        this.sendEmailSync(to, subject, content, false, true);
    }
    private String formatCurrency(Double amount) {
        Locale locale = new Locale("vi", "VN");
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(locale);
        return currencyFormatter.format(amount);
    }
}
