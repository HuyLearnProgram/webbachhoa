package com.app.webnongsan.domain.response.product;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProductImportResultDTO {
    private int totalRows;
    private int successCount;
    private List<RowError> errors;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RowError {
        private int row;
        private String message;
    }
}
