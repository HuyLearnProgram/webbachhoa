package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkActiveRequestDTO {
    @NotEmpty(message = "Danh sách sản phẩm không được để trống")
    private List<Long> ids;

    @NotNull(message = "Trạng thái không được để trống")
    private Boolean active;
}
