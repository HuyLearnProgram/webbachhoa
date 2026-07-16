package com.app.webnongsan.domain.response.product;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

// Gộp 3 số liệu dashboard admin (tồn kho thấp, phân bố theo danh mục, phân bố theo loại khuyến mãi)
// vào 1 lần gọi thay vì FE tự fan-out N+1 request (1 lowStock + N category + N promotionType).
// categoryCounts/promotionCounts chỉ chứa key CÓ sản phẩm — FE tự map phần còn lại về 0 khi đối
// chiếu với danh sách category/promotionType đầy đủ đang có sẵn ở phía client.
@Getter
@Setter
@AllArgsConstructor
public class ProductStatsDTO {
    private long lowStockCount;
    private Map<Long, Long> categoryCounts;
    private Map<String, Long> promotionCounts;
}
