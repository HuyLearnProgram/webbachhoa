package com.app.webnongsan.util.testcomponent;

import org.springframework.stereotype.Component;


import java.util.Arrays;
import java.util.List;

@Component
public class AddressValidator {

    private static final int MIN_LENGTH = 10;
    private static final int MAX_LENGTH = 200;
    private static final String SPECIAL_CHARS_REGEX = "[!@#$%^&*()+=\\[\\]{};':\"\\\\|<>?~`]";
    private static final List<String> REQUIRED_KEYWORDS = Arrays.asList(
            "phường", "xã", "quận", "huyện", "thành phố", "tỉnh", "tp.", "tp", "hcm", "hà nội", "sài gòn"
    );

    public ValidationResult validateAddress(String address) {
        // P5: Empty or null check
        if (address == null || address.isEmpty()) {
            return new ValidationResult(false, "Địa chỉ không được để trống");
        }

        // P6: Only whitespace check (TRƯỚC khi trim)
        if (address.trim().isEmpty()) {
            return new ValidationResult(false, "Địa chỉ không được chỉ chứa khoảng trắng");
        }

        String trimmedAddress = address.trim();

        // P7: Too short check (TRƯỚC khi check only numbers)
        if (trimmedAddress.length() < MIN_LENGTH) {
            return new ValidationResult(false, "Địa chỉ phải có ít nhất " + MIN_LENGTH + " ký tự");
        }

        // P8: Too long check
        if (trimmedAddress.length() > MAX_LENGTH) {
            return new ValidationResult(false, "Địa chỉ không được vượt quá " + MAX_LENGTH + " ký tự");
        }

        // P9: Only numbers check (SAU khi check length)
        if (trimmedAddress.matches("\\d+")) {
            return new ValidationResult(false, "Địa chỉ không thể chỉ chứa số");
        }

        // P10: Invalid special characters check
        if (trimmedAddress.matches(".*" + SPECIAL_CHARS_REGEX + ".*")) {
            return new ValidationResult(false, "Địa chỉ chứa ký tự đặc biệt không hợp lệ");
        }

        // P11: Missing district/city check với improved logic
        boolean hasRequiredKeyword = REQUIRED_KEYWORDS.stream()
                .anyMatch(keyword -> trimmedAddress.toLowerCase()
                        .replaceAll("\\.", "") // Remove dots for matching
                        .contains(keyword.toLowerCase()));

        if (!hasRequiredKeyword) {
            return new ValidationResult(false, "Địa chỉ thiếu thông tin tỉnh/thành phố");
        }

        return new ValidationResult(true, null);
    }
}

