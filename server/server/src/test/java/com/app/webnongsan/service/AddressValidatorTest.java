package com.app.webnongsan.service;

import com.app.webnongsan.util.testcomponent.AddressValidator;
import com.app.webnongsan.util.testcomponent.ValidationResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class AddressValidatorTest {

    @InjectMocks
    private AddressValidator addressValidator;

    // Test data constants
    private static final List<String> VALID_ADDRESSES = Arrays.asList(
            "57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn",  // P1: Standard format
            "123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM",           // P2: Vietnamese chars
            "45A/2B Lê Lợi, Phường Bến Nghé, Quận 1, TPHCM",        // P3: Mixed numbers/letters
            "Số 10, Ngõ 15, Đường ABC, Phường XYZ, Quận DEF, Hà Nội" // P4: Full detailed format
    );

    private static final List<TestCase> INVALID_ADDRESSES = Arrays.asList(
            new TestCase("", "Địa chỉ không được để trống"),                    // P5: Empty
            new TestCase(null, "Địa chỉ không được để trống"),                  // P5: Null
            new TestCase("   ", "Địa chỉ không được chỉ chứa khoảng trắng"),    // P6: Whitespace
            new TestCase("123 ABC", "Địa chỉ phải có ít nhất 10 ký tự"),        // P7: Too short
            new TestCase("A".repeat(201), "Địa chỉ không được vượt quá 200 ký tự"), // P8: Too long
            new TestCase("1234567890", "Địa chỉ không thể chỉ chứa số"),        // P9: Only numbers (10 digits)
            new TestCase("123 ABC@#$%", "Địa chỉ chứa ký tự đặc biệt không hợp lệ"), // P10: Special chars
            new TestCase("123 Đường ABC", "Địa chỉ thiếu thông tin tỉnh/thành phố")  // P11: Missing info
    );

    static class TestCase {
        String input;
        String expectedError;

        TestCase(String input, String expectedError) {
            this.input = input;
            this.expectedError = expectedError;
        }
    }

    // ========== VALID CASES TESTS ==========

    @ParameterizedTest
    @ValueSource(strings = {
            "57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn",
            "123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM",
            "45A/2B Lê Lợi, Phường Bến Nghé, Quận 1, TPHCM",
            "Số 10, Ngõ 15, Đường ABC, Phường XYZ, Quận DEF, Hà Nội"
    })
    @DisplayName("Test P1-P4: Valid Address Formats")
    void testValidAddressFormats(String address) {
        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    // ========== INVALID CASES TESTS ==========

    @ParameterizedTest
    @MethodSource("invalidAddressProvider")
    @DisplayName("Test P5-P11: Invalid Address Cases")
    void testInvalidAddressCases(String address, String expectedError) {
        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo(expectedError);
    }

    static Stream<Arguments> invalidAddressProvider() {
        return INVALID_ADDRESSES.stream()
                .map(testCase -> Arguments.of(testCase.input, testCase.expectedError));
    }

    // ========== BOUNDARY VALUE ANALYSIS ==========

    @Test
    @DisplayName("Test Lower Boundary: 9 characters (Invalid)")
    void testLowerBoundaryInvalid() {
        // Given
        String address = "123456789"; // 9 characters

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Địa chỉ phải có ít nhất 10 ký tự");
    }

    @Test
    @DisplayName("Test Lower Boundary: 10 characters (Valid)")
    void testLowerBoundaryValid() {
        // Given - Sử dụng địa chỉ chắc chắn hợp lệ
        String address = "123 HCM ST"; // 10 characters với "HCM" keyword

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }


    @Test
    @DisplayName("Test Upper Boundary: 201 characters (Invalid)")
    void testUpperBoundaryInvalid() {
        // Given
        String address = "A".repeat(201); // 201 characters

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Địa chỉ không được vượt quá 200 ký tự");
    }

    // ========== EDGE CASES ==========

    @Test
    @DisplayName("Test Edge Case: Leading and Trailing Whitespace")
    void testLeadingTrailingWhitespace() {
        // Given
        String address = "  123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM  ";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("Test Edge Case: Multiple Internal Spaces")
    void testMultipleInternalSpaces() {
        // Given
        String address = "123   Nguyễn   Văn   A,   Phường   1,   Quận   1,   TP.HCM";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    // ========== INDIVIDUAL PARTITION TESTS ==========

    @Test
    @DisplayName("Test P1: Standard Format Address")
    void testStandardFormatAddress() {
        // Given
        String address = "57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("Test P2: Vietnamese Characters Support")
    void testVietnameseCharactersSupport() {
        // Given
        String address = "123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("Test P3: Mixed Numbers and Letters")
    void testMixedNumbersAndLetters() {
        // Given
        String address = "45A/2B Lê Lợi, Phường Bến Nghé, Quận 1, TPHCM";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("Test P4: Full Detailed Format")
    void testFullDetailedFormat() {
        // Given
        String address = "Số 10, Ngõ 15, Đường ABC, Phường XYZ, Quận DEF, Hà Nội";

        // When
        ValidationResult result = addressValidator.validateAddress(address);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }
}
