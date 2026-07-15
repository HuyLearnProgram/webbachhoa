package com.app.webnongsan.controller;

import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.service.EventTrackingService;
import com.app.webnongsan.util.annotation.ApiMessage;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Đọc lại "sản phẩm đã xem" cho trang member — tách khỏi EventTrackingController vì
// controller đó chỉ chứa endpoint permitAll (ghi hành vi); đây là GET đòi hỏi đăng nhập,
// path "product-views" không khớp rule permitAll nào của "products/**" nên tự rơi xuống
// anyRequest().authenticated() trong SecurityConfiguration — không cần sửa rule bảo mật.
@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class ProductViewController {
    private final EventTrackingService eventTrackingService;

    @GetMapping("product-views")
    @ApiMessage("Get recently viewed products")
    public ResponseEntity<PaginationDTO> getRecentlyViewed(@PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(this.eventTrackingService.getRecentlyViewedByCurrentUser(pageable));
    }
}
