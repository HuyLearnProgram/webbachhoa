package com.app.webnongsan.controller;

import com.app.webnongsan.domain.response.ResponseObject;
import com.app.webnongsan.domain.response.payment.PaymentDTO;
import com.app.webnongsan.service.PaymentService;
import com.app.webnongsan.util.exception.ResourceInvalidException;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/v2/payment")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @Value("${app.frontend-url}")
    private String frontendUrl;
    @GetMapping("/vn-pay")
    public ResponseObject<PaymentDTO.VNPayResponse> pay(HttpServletRequest request) throws ResourceInvalidException {
        return new ResponseObject<>(HttpStatus.OK, "Success", paymentService.createVnPayPayment(request));
    }

    @GetMapping("/vn-pay-callback")
    public ResponseEntity<?> payCallbackHandler(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0 && values[0] != null && !values[0].isEmpty()) {
                fields.put(key, values[0]);
            }
        });

        boolean paid = paymentService.confirmVnPayCallback(fields);
        String redirectUrl = paid
                ? frontendUrl + "/payment-success"
                : frontendUrl + "/payment-failure";
        return ResponseEntity.status(HttpStatus.FOUND).header("Location", redirectUrl).build();
    }
}
