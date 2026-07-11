package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrackSearchDTO {
    @Size(max = 64)
    private String sessionId;

    @NotBlank(message = "keyword không được để trống")
    @Size(max = 255)
    private String keyword;

    private int resultCount;

    // sản phẩm được click từ kết quả tìm kiếm (gửi ở lần gọi cập nhật sau, có thể null)
    private Long clickedProductId;

    // id của SearchLog đã tạo trước đó — dùng khi cập nhật clickedProductId
    private Long searchLogId;

    // ===== Smart Search Phase C — đều optional, client cũ không gửi vẫn hợp lệ =====
    @Size(max = 30)
    private String searchMode;

    // vị trí 1-based của sản phẩm được click (tính cả phân trang) — gửi cùng lần cập nhật click
    private Integer clickedPosition;

    // true = kết quả thuần semantic (LIKE rỗng) — FE lấy từ response smart-search
    private Boolean lexicalEmpty;
}
