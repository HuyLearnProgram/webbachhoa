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
}
