package com.app.webnongsan.domain.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class LuckyDrawSpinResultDTO {
    private boolean won;
    private String prizeLabel;
    private String voucherCode; // null nếu trượt hoặc giải không kèm voucher
}
