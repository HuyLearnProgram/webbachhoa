package com.app.webnongsan.domain.request;

import lombok.Getter;
import lombok.Setter;

// 1 dòng sản phẩm trong giỏ, dùng bởi POST /vouchers/preview để xác định danh mục hợp lệ khi
// voucher bị scope theo category — lineTotal do FE tính sẵn (client-trusted, chỉ mang tính advisory
// giống orderTotal; enforcement thật dùng dữ liệu server tính trong OrderService.create()).
@Getter
@Setter
public class VoucherItemLineDTO {
    private Long productId;
    private Double lineTotal;
}
