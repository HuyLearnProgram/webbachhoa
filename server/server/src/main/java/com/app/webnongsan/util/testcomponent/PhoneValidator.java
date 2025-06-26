package com.app.webnongsan.util.testcomponent;

import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class PhoneValidator {

    private static final int MIN_LENGTH = 10;
    private static final int MAX_LENGTH = 11;

    // Cập nhật danh sách đầu số chính xác theo chuẩn Việt Nam 2024
    private static final List<String> VALID_PREFIXES = Arrays.asList(
            // Viettel
            "032", "033", "034", "035", "036", "037", "038", "039",
            "086", "096", "097", "098",

            // Vinaphone
            "081", "082", "083", "084", "085", "088", "091", "094",

            // Mobifone
            "070", "076", "077", "078", "079", "089", "090", "093",

            // Vietnamobile
            "052", "056", "058", "092",

            // Gmobile
            "059", "099"
    );

    public ValidationResult validatePhoneNumber(String phoneNumber) {
        // P8: Empty or null check
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return new ValidationResult(false, "Số điện thoại không được để trống");
        }

        // Normalize phone number (remove spaces, dashes)
        String normalizedPhone = phoneNumber.replaceAll("[\\s-]", "");

        // P14: Must start with 0
        if (!normalizedPhone.startsWith("0")) {
            return new ValidationResult(false, "Số điện thoại phải bắt đầu bằng số 0");
        }

        // P12, P13: Only digits and valid separators allowed
        if (!phoneNumber.matches("^[0-9\\s-]+$")) {
            return new ValidationResult(false, "Số điện thoại chỉ được chứa số và ký tự phân cách hợp lệ");
        }

        // P9: Too short check
        if (normalizedPhone.length() < MIN_LENGTH) {
            return new ValidationResult(false, "Số điện thoại phải có ít nhất " + MIN_LENGTH + " số");
        }

        // P10: Too long check
        if (normalizedPhone.length() > MAX_LENGTH) {
            return new ValidationResult(false, "Số điện thoại không được vượt quá " + MAX_LENGTH + " số");
        }

        // P11: Check valid prefix (chỉ check 10 số cho đơn giản)
        if (normalizedPhone.length() == 10) {
            String prefix = normalizedPhone.substring(0, 3);
            if (!VALID_PREFIXES.contains(prefix)) {
                return new ValidationResult(false, "Đầu số điện thoại không hợp lệ");
            }
        } else {
            // Cho phép 11 số (format cũ) nhưng không validate prefix chi tiết
            return new ValidationResult(true, null);
        }

        return new ValidationResult(true, null);
    }
}
