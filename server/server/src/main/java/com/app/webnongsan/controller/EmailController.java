package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.RestResponse;
import com.app.webnongsan.domain.response.feedback.FeedbackDTO;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.service.EmailService;
import com.app.webnongsan.service.UserService;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class EmailController {
    private final EmailService emailService;
    private final UserRepository userRepository;

    @PostMapping("checkout/email")
    @ApiMessage("Create a checkout payment")
    public ResponseEntity<RestResponse<Long>> create(
            @RequestParam("userId") Long userId,
            @RequestParam("address") String address,
            @RequestParam("phone") String phone,
            @RequestParam("paymentMethod") String paymentMethod,
            @RequestParam("totalPrice") Double totalPrice,
            @RequestParam("items") MultipartFile itemsFile
    ) throws ResourceInvalidException {
        RestResponse<Long> response = new RestResponse<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<OrderDetailDTO> items = mapper.readValue(itemsFile.getInputStream(), new TypeReference<List<OrderDetailDTO>>() {});
            String email = SecurityUtil.getCurrentUserLogin().isPresent() ? SecurityUtil.getCurrentUserLogin().get() : "";
            User u = this.userRepository.findByEmail(email);
            if (u == null) {
                throw new ResourceInvalidException("User không tồn tại");
            }

            String templateName = "checkout";

            // Gửi email sau khi thanh toán thành công
            String subject = "Thông tin đơn hàng";

            emailService.sendEmailFromTemplateSyncCheckout(email, subject, templateName, u.getName(), address, phone, paymentMethod, totalPrice,items);
//            response.setData(order.getId());
            response.setStatusCode(HttpStatus.CREATED.value());
            response.setMessage("Gửi email thành công");

            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (Exception e) {
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.setError(e.getMessage());
            response.setMessage("Có lỗi xảy ra trong quá trình thanh toán");
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
