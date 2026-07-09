package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.response.RestResponse;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.service.EmailService;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.PermissionException;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class EmailController {
    private final EmailService emailService;
    private final OrderRepository orderRepository;

    @PostMapping("checkout/email")
    @ApiMessage("Send order confirmation email")
    public ResponseEntity<RestResponse<Void>> create(@RequestParam("orderId") Long orderId) {
        RestResponse<Void> response = new RestResponse<>();
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceInvalidException("Đơn hàng id=" + orderId + " không tồn tại"));
            String actorEmail = SecurityUtil.getCurrentUserLogin().orElse(null);
            boolean isOwner = actorEmail != null && actorEmail.equalsIgnoreCase(order.getUser().getEmail());
            if (!isOwner) {
                throw new PermissionException("Bạn không có quyền gửi email cho đơn hàng này");
            }

            emailService.sendOrderConfirmationEmail(orderId);
            response.setStatusCode(HttpStatus.OK.value());
            response.setMessage("Gửi email thành công");

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (PermissionException e) {
            response.setStatusCode(HttpStatus.FORBIDDEN.value());
            response.setError(e.getMessage());
            response.setMessage("Không có quyền thực hiện");
            return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
        } catch (Exception e) {
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.setError(e.getMessage());
            response.setMessage("Có lỗi xảy ra khi gửi email xác nhận đơn hàng");
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
