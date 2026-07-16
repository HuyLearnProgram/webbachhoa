package com.app.webnongsan.service;

import com.app.webnongsan.domain.CartRecoveryDiscount;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.repository.CartRecoveryDiscountRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;

// Tính tiền 1 dòng sản phẩm theo loại khuyến mãi — dùng ở OrderService.create() làm nguồn tính total
// duy nhất, chống giả mạo giá (không tin số liệu client gửi lên), khớp công thức phía frontend
// (src/utils/promotion.js). Kể từ khi thêm Flash Sale cá nhân (Cart Recovery), đây CŨNG là nguồn duy
// nhất để tính giá hiệu lực có tính tới userId — CartService (hiển thị giỏ hàng) và OrderService (tính
// tiền thật) đều PHẢI gọi qua đây, không tự dựng lại logic ưu tiên personal > flash-sale > giảm giá
// thường ở nơi khác (đúng bài học "nhiều nơi tự dựng logic phân kỳ nhau" đã ghi CLAUDE.md).
@Service
public class PromotionService {
    private static final Logger log = LoggerFactory.getLogger(PromotionService.class);
    private final CartRecoveryDiscountRepository cartRecoveryDiscountRepository;
    private final String window1Start;
    private final String window1End;
    private final String window2Start;
    private final String window2End;
    // Bản đã parse sẵn (nullable nếu config sai định dạng) — tránh gọi LocalTime.parse() lặp lại trên
    // hot path (isBetween() được gọi ở MỌI lần tính giá: giỏ hàng/PDP/checkout). Parse 1 lần lúc khởi
    // tạo, không đổi giá trị lúc runtime nên cache an toàn.
    private final LocalTime window1StartTime;
    private final LocalTime window1EndTime;
    private final LocalTime window2StartTime;
    private final LocalTime window2EndTime;

    // Constructor tường minh (KHÔNG @AllArgsConstructor của Lombok) — Lombok sinh constructor không
    // giữ lại annotation @Value trên tham số, khiến Spring hiểu nhầm thành cần inject bean kiểu String
    // (lỗi thật đã gặp: "No qualifying bean of type 'java.lang.String'"). Đúng pattern đã dùng ở
    // CartRecoveryScheduler.
    public PromotionService(CartRecoveryDiscountRepository cartRecoveryDiscountRepository,
                             @Value("${flash-sale.window1-start:12:00}") String window1Start,
                             @Value("${flash-sale.window1-end:14:00}") String window1End,
                             @Value("${flash-sale.window2-start:20:00}") String window2Start,
                             @Value("${flash-sale.window2-end:22:00}") String window2End) {
        this.cartRecoveryDiscountRepository = cartRecoveryDiscountRepository;
        this.window1Start = window1Start;
        this.window1End = window1End;
        this.window2Start = window2Start;
        this.window2End = window2End;
        this.window1StartTime = parseTimeOrNull(window1Start);
        this.window1EndTime = parseTimeOrNull(window1End);
        this.window2StartTime = parseTimeOrNull(window2Start);
        this.window2EndTime = parseTimeOrNull(window2End);
    }

    // 1 giá trị config sai định dạng (VD "24:00" thay vì "23:59") KHÔNG được phép làm sập service lúc
    // khởi động — parse lỗi -> null -> isBetween() coi khung đó "không hoạt động" (an toàn hơn crash),
    // chỉ log cảnh báo 1 lần lúc khởi tạo (không spam log mỗi lần tính giá như trước khi parse lặp lại).
    private LocalTime parseTimeOrNull(String raw) {
        try {
            return LocalTime.parse(raw);
        } catch (Exception e) {
            log.warn("Cấu hình khung giờ Flash Sale sai định dạng ('{}'): {} — coi như khung này không hoạt động",
                    raw, e.getMessage());
            return null;
        }
    }

    @Getter
    @AllArgsConstructor
    public static class LineTotal {
        private final double total;
        private final int freeUnits;
    }

    @Getter
    @AllArgsConstructor
    public static class PersonalDiscount {
        private final double effectivePrice;
        private final Instant expiresAt;
    }

    // userId = null cho guest hoặc cho lời gọi không cần biết giá cá nhân (VD ProductService.deductStock
    // chỉ cần freeUnits, không đụng tới nhánh giá) — Flash Sale cá nhân CHỈ áp dụng cho user đã đăng nhập.
    public LineTotal calculateLineTotal(Product product, int quantity, Long userId) {
        String type = product.getPromotionType() == null ? "NONE" : product.getPromotionType();
        double price = getEffectiveUnitPrice(product, userId);
        switch (type) {
            case "BUY_X_GET_Y": {
                // "quantity" là số lượng khách MUA (trả tiền), quà tặng là số lượng CỘNG THÊM, không trừ vào giá phải trả.
                // VD "Mua 4 tặng 1": mua 8 (2 lần 4) -> tặng 2, vẫn tính tiền đủ 8 (không phải 6).
                Integer buyQty = product.getPromoBuyQuantity();
                Integer freeQty = product.getPromoFreeQuantity();
                if (buyQty == null || freeQty == null || buyQty < 1 || freeQty < 1) {
                    return new LineTotal(price * quantity, 0);
                }
                int freeUnits = (quantity / buyQty) * freeQty;
                return new LineTotal(price * quantity, freeUnits);
            }
            case "BUNDLE_PRICE": {
                Integer bundleQty = product.getPromoBundleQuantity();
                Double bundlePrice = product.getPromoBundlePrice();
                if (bundleQty == null || bundlePrice == null || bundleQty < 2) {
                    return new LineTotal(price * quantity, 0);
                }
                int bundles = quantity / bundleQty;
                int remainder = quantity % bundleQty;
                return new LineTotal(bundles * bundlePrice + remainder * price, 0);
            }
            default:
                return new LineTotal(price * quantity, 0);
        }
    }

    // Giá khách THỰC TRẢ mỗi đơn vị — PUBLIC vì OrderService cần dùng lại đúng giá trị này để snapshot
    // unit_price/originalPrice vào OrderDetail (không tự tính discountActive riêng lẻ như trước, dễ
    // lệch với Flash Sale cá nhân/khung giờ). Thứ tự ưu tiên: (1) Flash Sale CÁ NHÂN đang hiệu lực cho
    // đúng user này > (2) giảm giá PRICE_DISCOUNT công khai (nếu isFlashSale=true thì CHỈ áp dụng trong
    // khung giờ Flash Sale, ngoài giờ tự về giá thường — nếu isFlashSale=false thì áp dụng cả ngày như
    // trước giờ) > (3) giá bán ổn định `price`.
    public double getEffectiveUnitPrice(Product product, Long userId) {
        Optional<PersonalDiscount> personal = getActivePersonalDiscount(product.getId(), userId, product.getPrice());
        if (personal.isPresent()) return personal.get().getEffectivePrice();

        if (!"PRICE_DISCOUNT".equals(product.getPromotionType())) return product.getPrice();
        if (product.getDiscountPrice() == null || product.getDiscountPrice() >= product.getPrice()) return product.getPrice();
        if (Boolean.TRUE.equals(product.getIsFlashSale()) && !isWithinFlashSaleWindow(Instant.now(), product)) return product.getPrice();
        return product.getDiscountPrice();
    }

    // Dùng chung cho cả tính tiền (OrderService) lẫn hiển thị (CartService enrich CartItemDTO) — nhận
    // productId + currentPrice thay vì cả Product entity để CartService không cần load lại Product khi
    // đã có sẵn giá từ CartItemDTO. Rỗng nếu: guest, ngoài khung giờ Flash Sale, hoặc không có grant còn hiệu lực.
    public Optional<PersonalDiscount> getActivePersonalDiscount(Long productId, Long userId, double currentPrice) {
        if (userId == null) return Optional.empty();
        Instant now = Instant.now();
        if (!isWithinFlashSaleWindow(now)) return Optional.empty();
        return cartRecoveryDiscountRepository
                .findFirstByUser_IdAndProduct_IdAndExpiresAtAfterOrderByExpiresAtDesc(userId, productId, now)
                .map(d -> {
                    double raw = currentPrice * d.getDiscountPercent() / 100.0;
                    // maxDiscountAmount null = không giới hạn trần (khớp semantics field cùng tên trên
                    // VoucherAutoGrantRule — "để trống nếu không giới hạn").
                    double discountAmount = d.getMaxDiscountAmount() != null ? Math.min(raw, d.getMaxDiscountAmount()) : raw;
                    return new PersonalDiscount(currentPrice - discountAmount, d.getExpiresAt());
                });
    }

    // Expose cấu hình khung giờ cho FE (banner tab "Đang diễn ra"/"Sắp diễn ra") — tránh hardcode giờ
    // ở FE dễ lệch với BE mỗi khi admin đổi config (đúng bài học "mọi logic phân biệt phải có 1 nguồn
    // sự thật" đã rút ra từ sự cố "24:00" vừa gặp).
    public java.util.Map<String, String> getFlashSaleWindowsConfig() {
        return java.util.Map.of(
                "window1Start", window1Start, "window1End", window1End,
                "window2Start", window2Start, "window2End", window2End
        );
    }

    // Dùng cho Flash Sale CÁ NHÂN (Cart Recovery) — LUÔN áp dụng cả 2 khung giờ, không có khái niệm
    // "chọn khung" vì đây không phải sản phẩm admin cấu hình tay.
    public boolean isWithinFlashSaleWindow(Instant now) {
        LocalTime t = now.atZone(ZoneId.systemDefault()).toLocalTime();
        return isBetween(t, window1StartTime, window1EndTime) || isBetween(t, window2StartTime, window2EndTime);
    }

    // Dùng cho Flash Sale CÔNG KHAI (Product.isFlashSale=true, admin tự cấu hình) — chỉ tính khung giờ
    // mà admin ĐÃ CHỌN cho đúng sản phẩm này (flashSaleWindow1/2, mặc định cả 2 = true nếu null để
    // không phá sản phẩm cũ tick isFlashSale trước khi có tính năng chọn khung giờ này).
    public boolean isWithinFlashSaleWindow(Instant now, Product product) {
        LocalTime t = now.atZone(ZoneId.systemDefault()).toLocalTime();
        boolean w1 = !Boolean.FALSE.equals(product.getFlashSaleWindow1());
        boolean w2 = !Boolean.FALSE.equals(product.getFlashSaleWindow2());
        return (w1 && isBetween(t, window1StartTime, window1EndTime)) || (w2 && isBetween(t, window2StartTime, window2EndTime));
    }

    // start/end null nghĩa là config sai định dạng (đã log cảnh báo 1 lần lúc khởi tạo ở parseTimeOrNull)
    // — coi khung đó "không hoạt động" thay vì crash, giữ đúng tinh thần an toàn của bản gốc.
    private boolean isBetween(LocalTime t, LocalTime start, LocalTime end) {
        if (start == null || end == null) return false;
        return !t.isBefore(start) && t.isBefore(end);
    }
}
