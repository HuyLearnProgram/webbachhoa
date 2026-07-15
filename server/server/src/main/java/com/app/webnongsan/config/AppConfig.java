package com.app.webnongsan.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // Không có module này, Jackson serialize trực tiếp field @ManyToOne(LAZY) (VD
    // Voucher.applicableCategory, VoucherAutoGrantRule.applicableCategory) sẽ ném "Type definition
    // error: [simple type, class org.hibernate.proxy.pojo.bytebuddy.ByteBuddyInterceptor]" bất cứ khi
    // nào FK khác null và entity được fetch lại từ DB (không phải object vừa save() còn trong bộ nhớ) —
    // dính thật ở GET /vouchers/{id} và GET /admin/voucher-auto-grant-rules/{id} khi có category.
    // FORCE_LAZY_LOADING vì code hiện tại (nhiều DTO/service) đã giả định applicableCategory luôn
    // resolve được dữ liệu thật khi khác null, không tự chấp nhận bị serialize âm thầm thành null.
    //
    // BUG NGHIÊM TRỌNG phát hiện sau (2026-07-15): Feature.USE_TRANSIENT_ANNOTATION của module này
    // BẬT MẶC ĐỊNH — coi MỌI field có @jakarta.persistence.Transient (bất kể class có phải @Entity
    // hay không) như @JsonIgnore, tự động ẩn khỏi JSON response. Dự án dùng @Transient trên
    // OrderDetailDTO (KHÔNG phải @Entity) như 1 quy ước riêng để đánh dấu "field set bằng setter,
    // không nằm trong constructor-projection" — hoàn toàn không liên quan JPA persistence. Hậu quả:
    // toàn bộ field orderId/status/orderTime/category/imageUrl/voucherCode/... của mọi đơn hàng trong
    // GET /orders (trang History khách hàng) bị strip khỏi JSON, FE nhận undefined -> ternary hiển thị
    // sai trạng thái ("Cancelled" thay vì "Pending" khi status=0, đúng giá trị int rơi vào nhánh else).
    // Cũng ảnh hưởng Product.promotionDurationDays/User.lockReason (2 field @Transient hợp lệ trên
    // entity thật, nhưng vẫn cần lộ ra API). Disable feature này để khôi phục hành vi Jackson mặc định
    // (serialize theo getter/field như bình thường) — KHÔNG đánh đổi gì so với lý do bật module ở trên,
    // vì FORCE_LAZY_LOADING là feature riêng, độc lập với USE_TRANSIENT_ANNOTATION.
    @Bean
    public Hibernate6Module hibernate6Module() {
        Hibernate6Module module = new Hibernate6Module();
        module.enable(Hibernate6Module.Feature.FORCE_LAZY_LOADING);
        module.disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION);
        return module;
    }

    // Riêng cho proxy sang Python recommendation-service: timeout ngắn bắt buộc
    // (fail-fast rồi fallback rule-based, không để Home/PDP treo khi Python chết).
    // Không dùng chung bean restTemplate ở trên vì bean đó không có timeout.
    @Bean(name = "recommendationRestTemplate")
    public RestTemplate recommendationRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2500);
        return new RestTemplate(factory);
    }

    // Phase 3: riêng cho proxy metrics experiment (dashboard admin) — query GROUP BY quét bảng
    // impressions lớn cần read timeout dài hơn nhiều. TUYỆT ĐỐI không nới timeout của
    // recommendationRestTemplate ở trên (phá fail-fast fallback của Home/PDP/Cart).
    @Bean(name = "recommendationMetricsRestTemplate")
    public RestTemplate recommendationMetricsRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(15000);
        return new RestTemplate(factory);
    }
}
