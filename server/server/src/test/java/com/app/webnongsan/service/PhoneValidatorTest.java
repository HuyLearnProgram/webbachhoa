package com.app.webnongsan.service;

import com.app.webnongsan.util.testcomponent.PhoneValidator;
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

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@ExtendWith(MockitoExtension.class)
class PhoneValidatorTest {

    @InjectMocks
    private PhoneValidator phoneValidator;

    // Test data
    private static final List<TestCase> INVALID_PHONES = Arrays.asList(
            new TestCase("", "Số điện thoại không được để"),                    // P8: Empty
            new TestCase(null, "Số điện thoại không được để trống"),                  // P8: Null
            new TestCase("091234567", "Số điện thoại phải có ít nhất 10 số"),         // P9: Too short
            new TestCase("012345678901", "Số điện thoại không được vượt quá 11 số"),  // P10: Too long
            new TestCase("0112345678", "Đầu số điện thoại không hợp lệ"),             // P11: Invalid prefix
            new TestCase("091234567a", "Số điện thoại chỉ được chứa số và ký tự phân cách hợp lệ"), // P12: Letters
            new TestCase("912345678", "Số điện thoại phải bắt đầu bằng số 0")          // P14: No leading 0
    );

    static class TestCase {
        String input;
        String expectedError;

        TestCase(String input, String expectedError) {
            this.input = input;
            this.expectedError = expectedError;
        }
    }

    // ========== PHÂN VÙNG TƯƠNG ĐƯƠNG ==========

    @ParameterizedTest
    @ValueSource(strings = {
            "0912345678", "0987654321", "0337654321", "0567654321",
            "0777654321", "0857654321", "0521234567", "0591234567"
    })
    @DisplayName("Test Valid Phone Numbers")
    void testValidPhoneNumbers(String phoneNumber) {
        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @ParameterizedTest
    @MethodSource("invalidPhoneProvider")
    @DisplayName("Test Invalid Phone Numbers")
    void testInvalidPhoneNumbers(String phoneNumber, String expectedError) {
        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo(expectedError);
    }

    static Stream<Arguments> invalidPhoneProvider() {
        return INVALID_PHONES.stream()
                .map(testCase -> Arguments.of(testCase.input, testCase.expectedError));
    }

    // ========== BOUNDARY VALUE ANALYSIS ==========

    @Test
    @DisplayName("Test Boundary: 9 digits (Invalid)")
    void testBoundary9Digits() {
        // Given
        String phoneNumber = "091234567"; // 9 digits

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Số điện thoại phải có ít nhất 10 số");
    }

    @Test
    @DisplayName("Test Boundary: 10 digits (Valid)")
    void testBoundary10Digits() {
        // Given
        String phoneNumber = "0912345678"; // 10 digits

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @Test
    @DisplayName("Test Boundary: 12 digits (Invalid)")
    void testBoundary12Digits() {
        // Given
        String phoneNumber = "091234567890"; // 12 digits

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Số điện thoại không được vượt quá 11 số");
    }

    // ========== PARAMETERIZED TESTS ==========

    @ParameterizedTest
    @ValueSource(strings = {
            "091-234-5678", "091 234 5678", " 0912345678 "
    })
    @DisplayName("Test Format Handling")
    void testFormatHandling(String phoneNumber) {
        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "032", "081", "070", "052", "059"
    })
    @DisplayName("Test Valid Prefixes")
    void testValidPrefixes(String prefix) {
        // Given
        String phoneNumber = prefix + "1234567";

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrorMessage()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "011", "041", "061", "071"
    })
    @DisplayName("Test Invalid Prefixes")
    void testInvalidPrefixes(String prefix) {
        // Given
        String phoneNumber = prefix + "1234567";

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Đầu số điện thoại không hợp lệ");
    }

    // ========== TESTS QUAN TRỌNG KHÁC ==========

    @Test
    @DisplayName("Test Empty and Null")
    void testEmptyAndNull() {
        // Test empty
        ValidationResult emptyResult = phoneValidator.validatePhoneNumber("");
        assertThat(emptyResult.isValid()).isFalse();
        assertThat(emptyResult.getErrorMessage()).isEqualTo("Số điện thoại không được để trống");

        // Test null
        ValidationResult nullResult = phoneValidator.validatePhoneNumber(null);
        assertThat(nullResult.isValid()).isFalse();
        assertThat(nullResult.getErrorMessage()).isEqualTo("Số điện thoại không được để trống");
    }

    @Test
    @DisplayName("Test Invalid Characters")
    void testInvalidCharacters() {
        List<String> invalidChars = Arrays.asList(
                "091234567a", "091234567@", "091.234.5678"
        );

        for (String phone : invalidChars) {
            ValidationResult result = phoneValidator.validatePhoneNumber(phone);
            assertThat(result.isValid()).isFalse();
            assertThat(result.getErrorMessage()).isEqualTo("Số điện thoại chỉ được chứa số và ký tự phân cách hợp lệ");
        }
    }

    @Test
    @DisplayName("Test Missing Leading Zero")
    void testMissingLeadingZero() {
        // Given
        String phoneNumber = "912345678";

        // When
        ValidationResult result = phoneValidator.validatePhoneNumber(phoneNumber);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrorMessage()).isEqualTo("Số điện thoại phải bắt đầu bằng số 0");
    }
}
