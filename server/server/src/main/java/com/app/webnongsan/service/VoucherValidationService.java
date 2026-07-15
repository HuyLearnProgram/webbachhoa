package com.app.webnongsan.service;

import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.UserVoucher;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserVoucherRepository;
import com.app.webnongsan.repository.VoucherRepository;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Nơi DUY NHẤT chứa logic validate/tính giảm giá voucher — dùng chung cho cả luồng tạo đơn thật
// (OrderService.applyVoucherToOrder) lẫn endpoint preview (VoucherController POST /vouchers/preview).
// Trước đây có 2 bản logic áp voucher phân kỳ nhau (1 bản chạy thật trong OrderService, 1 bản dead
// code trong VoucherService) gây ra các NPE không được test tới — không lặp lại sai lầm đó.
@Service
@AllArgsConstructor
public class VoucherValidationService {
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final ProductRepository productRepository;

    // 1 dòng sản phẩm trong giỏ (productId + lineTotal đã tính khuyến mãi) — dùng để xác định phần
    // giỏ hàng nào thuộc category của voucher khi voucher bị scope. lineTotal ở preview là client-trusted
    // (advisory), ở apply thật là server-trusted (tính lại trong OrderService.create()).
    public record ItemLine(Long productId, double lineTotal) {}

    @Getter
    @AllArgsConstructor
    public static class VoucherResolution {
        private final Voucher voucher;
        private final UserVoucher existingUserVoucher; // null nếu user chưa từng được assign/dùng
        private final double discountAmount;
        private final double totalAfterDiscount;
    }

    // checkPerUserUsage=true để chặn "voucher đã dùng rồi" ngay từ bước validate (áp dụng cho cả
    // preview lẫn apply thật) — enforcement THẬT của giới hạn lượt dùng (maxUsage) không nằm ở đây
    // mà ở update atomic incrementUsedCountIfAvailable() phía OrderService (chặn race condition).
    public VoucherResolution resolveAndValidate(Long voucherId, String code, User user, double orderTotal,
                                                 List<ItemLine> items, boolean checkPerUserUsage) throws ResourceInvalidException {
        Voucher voucher = (voucherId != null)
                ? voucherRepository.findById(voucherId)
                    .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"))
                : voucherRepository.findByCode(code)
                    .orElseThrow(() -> new ResourceInvalidException("Mã giảm giá không tồn tại"));

        if (!voucher.isActiveNow())
            throw new ResourceInvalidException("Voucher không còn hiệu lực");

        double eligibleSubtotal = resolveEligibleSubtotal(voucher, orderTotal, items);

        if (voucher.getMinimumOrderAmount() != null && eligibleSubtotal < voucher.getMinimumOrderAmount())
            throw new ResourceInvalidException("Đơn hàng không đủ điều kiện để sử dụng voucher");

        // Advisory check — chỉ để báo lỗi sớm/thân thiện ở bước preview; enforcement thật nằm ở
        // atomic update khi apply thật (OrderService), vì check-then-act ở đây không an toàn với
        // race condition giữa nhiều request đồng thời.
        int usedCount = voucher.getUsedCount() == null ? 0 : voucher.getUsedCount();
        if (voucher.getMaxUsage() != null && usedCount >= voucher.getMaxUsage())
            throw new ResourceInvalidException("Mã giảm giá đã dùng hết");

        UserVoucher uv = userVoucherRepository.findByUserIdAndVoucherId(user.getId(), voucher.getId()).orElse(null);
        if (checkPerUserUsage && uv != null && Boolean.TRUE.equals(uv.getIsUsed()))
            throw new ResourceInvalidException("Mã giảm giá đã được sử dụng");

        double discount = calculateDiscount(voucher, eligibleSubtotal);
        double after = Math.max(0, orderTotal - discount);
        return new VoucherResolution(voucher, uv, discount, after);
    }

    // Voucher không scope theo category -> tính trên toàn đơn (hành vi gốc). Voucher scope theo
    // category -> chỉ tính trên tổng lineTotal của các sản phẩm cùng category trong giỏ.
    private double resolveEligibleSubtotal(Voucher voucher, double orderTotal, List<ItemLine> items)
            throws ResourceInvalidException {
        if (voucher.getApplicableCategory() == null) return orderTotal;

        if (items == null || items.isEmpty())
            throw new ResourceInvalidException("Giỏ hàng không có sản phẩm thuộc danh mục áp dụng của voucher này");

        long categoryId = voucher.getApplicableCategory().getId();
        List<Long> productIds = items.stream().map(ItemLine::productId).toList();
        Map<Long, Long> categoryByProductId = new HashMap<>();
        for (Object[] row : productRepository.findCategoryIdsForProductIds(productIds)) {
            Long productId = (Long) row[0];
            Long catId = row[1] == null ? null : ((Number) row[1]).longValue();
            categoryByProductId.put(productId, catId);
        }

        double eligibleSubtotal = items.stream()
                .filter(item -> categoryId == java.util.Objects.requireNonNullElse(categoryByProductId.get(item.productId()), -1L))
                .mapToDouble(ItemLine::lineTotal)
                .sum();

        if (eligibleSubtotal <= 0)
            throw new ResourceInvalidException("Giỏ hàng không có sản phẩm thuộc danh mục áp dụng của voucher này");

        return eligibleSubtotal;
    }

    public double calculateDiscount(Voucher voucher, double eligibleSubtotal) {
        double raw = voucher.getType() == Voucher.VoucherType.PERCENT
                ? eligibleSubtotal * voucher.getDiscountValue() / 100.0
                : voucher.getDiscountValue();
        // maxDiscountAmount chỉ áp cho PERCENT — với FIXED, discountValue đã là số tiền cố định
        if (voucher.getType() == Voucher.VoucherType.PERCENT
                && voucher.getMaxDiscountAmount() != null && raw > voucher.getMaxDiscountAmount()) {
            raw = voucher.getMaxDiscountAmount();
        }
        return Math.min(raw, eligibleSubtotal); // không giảm quá phần đủ điều kiện
    }
}
