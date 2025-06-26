package com.app.webnongsan.util.testcomponent;

public class PhoneValidationResult {
    private boolean isValid;
    private String errorMessage;
    private String phoneType; // mobile, mobile_old, landline
    private String provider; // viettel, vinaphone, mobifone, etc.
    private String normalizedPhone;

    public PhoneValidationResult(boolean isValid, String errorMessage, String phoneType, String provider, String normalizedPhone) {
        this.isValid = isValid;
        this.errorMessage = errorMessage;
        this.phoneType = phoneType;
        this.provider = provider;
        this.normalizedPhone = normalizedPhone;
    }

    // Getters and setters
    public boolean isValid() { return isValid; }
    public void setValid(boolean valid) { isValid = valid; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public String getPhoneType() { return phoneType; }
    public void setPhoneType(String phoneType) { this.phoneType = phoneType; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getNormalizedPhone() { return normalizedPhone; }
    public void setNormalizedPhone(String normalizedPhone) { this.normalizedPhone = normalizedPhone; }
}
