package com.app.webnongsan.domain.response.product;

import com.app.webnongsan.domain.response.PaginationDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Kết quả Smart Search: giữ NGUYÊN shape meta/result của PaginationDTO (FE tái dùng toàn bộ
// render/pagination hiện có), thêm searchMode + requestId để FE log search_mode vào SearchLog
// (Phase C) và phân biệt nguồn khi quan sát.
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SmartSearchResultDTO {
    private PaginationDTO.Meta meta;
    private Object result;

    // SEMANTIC_HYBRID | TFIDF_HYBRID | LEXICAL_ONLY (từ Python)
    // | LEXICAL_FALLBACK (Java tự chạy LIKE vì Python lỗi/tắt cờ) | NO_MATCH
    private String searchMode;
    private String requestId;

    // Phase C: true = LIKE không khớp gì, kết quả thuần semantic ("rescue") — FE gửi kèm
    // apiTrackSearch để dashboard tính semantic-rescue rate. null ở nhánh LEXICAL_FALLBACK
    // (không có thông tin từ Python).
    private Boolean lexicalEmpty;
}
