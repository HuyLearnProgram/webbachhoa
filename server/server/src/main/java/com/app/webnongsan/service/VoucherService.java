package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;

import com.app.webnongsan.domain.request.VoucherPreviewRequestDTO;
import com.app.webnongsan.domain.request.VoucherRequestDTO;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.voucher.VoucherDTO;
import com.app.webnongsan.domain.response.voucher.VoucherPreviewResponseDTO;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.PaginationHelper;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;


import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class VoucherService {
    private static final Logger log = LoggerFactory.getLogger(VoucherService.class);

    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PaginationHelper paginationHelper;
    private final VoucherValidationService voucherValidationService;
    private final CategoryRepository categoryRepository;

    /**
     * Lấy danh sách voucher đang hoạt động
     */
    public List<Voucher> getAllActiveVouchers() {
        return voucherRepository.findAllActiveVouchers(Instant.now());
    }

    /**
     * Voucher đang hiển thị trên banner Flash Sale trang chủ (Phase 3 hệ trao voucher tự động) —
     * chỉ voucher công khai + được admin/tự động tick isFlashSale=true, sắp hết hạn hiện trước.
     */
    public List<Voucher> getFlashSaleVouchers() {
        return voucherRepository.findFlashSaleVouchers(Instant.now());
    }

    /**
     * Phân trang danh sách voucher của admin — thấy được CẢ voucher đã deactivate
     * (trước đây dùng findAllByIsActiveTrue nên admin không xem lại được voucher đã tắt).
     * Hỗ trợ filter (spring-filter) để search theo mã voucher trên UI admin.
     */
    public PaginationDTO getAllVouchers(Specification<Voucher> spec, Pageable pageable) {
        return paginationHelper.fetchAllEntities(spec, pageable, voucherRepository);
    }

    /**
     * Lấy các voucher người dùng hiện có (chưa dùng)
     */
    public PaginationDTO getVouchersOfCurrentUser(Pageable pageable) throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();

        // Mặc định "nhận gần nhất lên đầu" nếu client không tự chỉ định sort — tôn trọng sort của
        // client nếu có (VD trang admin cần sort khác thì không bị ép).
        Pageable effectivePageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "assignedAt"));

        Page<UserVoucher> userVoucherPage = userVoucherRepository.findActiveUserVouchers(user.getId(), Instant.now(), effectivePageable);

        Page<VoucherDTO> dtoPage = userVoucherPage.map(uv -> {
            Voucher v = uv.getVoucher();
            return new VoucherDTO(
                    v.getId(),
                    v.getCode(),
                    v.getType().name(),
                    v.getDiscountValue(),
                    v.getMinimumOrderAmount(),
                    v.getMaxUsage(),
                    v.getMaxDiscountAmount(),
                    v.getUsedCount(),
                    v.getIsActive(),
                    v.getStartDate(),
                    v.getEndDate(),
                    uv.getIsUsed(),
                    uv.getAssignedAt(),
                    v.getApplicableCategory() != null ? v.getApplicableCategory().getId() : null,
                    v.getApplicableCategory() != null ? v.getApplicableCategory().getName() : null,
                    v.getAutoGrantType() != null ? v.getAutoGrantType().name() : null
            );
        });

        return paginationHelper.fetchAllEntities(dtoPage);
    }

    /**
     * Tổng số tiền user hiện tại đã tiết kiệm được nhờ dùng voucher (chỉ tính đơn PAID) — hiện ở
     * trang "Ví voucher" khách hàng.
     */
    public double getMySavings() throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();
        return orderRepository.sumVoucherSavingsByUser(user.getId());
    }

    /**
     * Preview/validate voucher trước khi đặt hàng — dùng chung cho cả 2 luồng chọn-từ-danh-sách
     * (voucherId) và nhập-tay (code). Thuần đọc, KHÔNG tăng usedCount, KHÔNG ghi UserVoucher.
     */
    public VoucherPreviewResponseDTO previewVoucher(VoucherPreviewRequestDTO dto) throws ResourceInvalidException {
        if (dto.getVoucherId() == null && (dto.getCode() == null || dto.getCode().isBlank()))
            throw new ResourceInvalidException("Thiếu mã hoặc id voucher");

        User user = getCurrentUserOrThrow();
        List<VoucherValidationService.ItemLine> items = dto.getItems() == null ? List.of()
                : dto.getItems().stream()
                    .map(i -> new VoucherValidationService.ItemLine(i.getProductId(), i.getLineTotal()))
                    .toList();
        VoucherValidationService.VoucherResolution res = voucherValidationService
                .resolveAndValidate(dto.getVoucherId(), dto.getCode(), user, dto.getOrderTotal(), items, true);

        Voucher v = res.getVoucher();
        return new VoucherPreviewResponseDTO(
                v.getId(), v.getCode(), v.getType().name(), v.getDiscountValue(),
                res.getDiscountAmount(), res.getTotalAfterDiscount(),
                v.getMinimumOrderAmount(), v.getStartDate(), v.getEndDate(),
                v.getApplicableCategory() != null ? v.getApplicableCategory().getId() : null,
                v.getApplicableCategory() != null ? v.getApplicableCategory().getName() : null
        );
    }

    /**
     * Gán voucher cho người dùng hiện tại (nếu chưa có) — chỉ cho self-assign voucher còn hiệu lực.
     */
    @Transactional
    public void assignVoucherToCurrentUser(Long voucherId) throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"));
        if (!voucher.isActiveNow())
            throw new ResourceInvalidException("Voucher đã hết hạn hoặc không còn hoạt động, không thể lưu vào ví");
        // Chặn self-assign voucher riêng tư (hệ thống tự sinh cho đúng 1 user — welcome/birthday/...):
        // không có cờ này, user khác đoán được id vẫn tự lưu được voucher vốn dành riêng cho người khác.
        if (!Boolean.TRUE.equals(voucher.getIsPublic()))
            throw new ResourceInvalidException("Voucher không tồn tại");

        boolean alreadyAssigned = userVoucherRepository.existsByUserIdAndVoucherId(user.getId(), voucherId);
        if (alreadyAssigned)
            throw new ResourceInvalidException("Bạn đã có voucher này rồi");

        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setUser(user);
        userVoucher.setVoucher(voucher);
        userVoucherRepository.save(userVoucher);
    }

    /**
     * Xóa một voucher khỏi người dùng
     */
    @Transactional
    public void removeVoucherFromCurrentUser(Long voucherId) throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();
        Optional<UserVoucher> userVoucher = userVoucherRepository.findByUserIdAndVoucherId(user.getId(), voucherId);

        if (userVoucher.isEmpty())
            throw new ResourceInvalidException("Bạn không có voucher này");

        userVoucherRepository.delete(userVoucher.get());
    }

    private User getCurrentUserOrThrow() throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().orElse("");
        User user = userRepository.findByEmail(email);
        if (user == null) throw new ResourceInvalidException("User không tồn tại");
        return user;
    }

    /**
     * Admin dùng: lấy 1 voucher theo id (phục vụ trang sửa)
     */
    public Voucher getVoucherById(Long id) throws ResourceInvalidException {
        return voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"));
    }

    /**
     * Admin dùng: tạo voucher mới
     */
    public Voucher createVoucher(VoucherRequestDTO dto) throws ResourceInvalidException {
        if (voucherRepository.existsByCode(dto.getCode())) {
            throw new ResourceInvalidException("Mã voucher đã tồn tại");
        }
        if (dto.getType() == Voucher.VoucherType.FIXED && dto.getMaxDiscountAmount() != null) {
            throw new ResourceInvalidException("Trần giảm giá tối đa chỉ áp dụng cho voucher theo phần trăm");
        }

        Voucher voucher = new Voucher();
        applyRequestToEntity(voucher, dto);
        voucher.setUsedCount(0);
        voucher.setIsActive(dto.getIsActive() == null || dto.getIsActive());

        return voucherRepository.save(voucher);
    }

    /**
     * Admin dùng: sửa voucher
     */
    public Voucher updateVoucher(Long id, VoucherRequestDTO dto) throws ResourceInvalidException {
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"));

        if (dto.getType() == Voucher.VoucherType.FIXED && dto.getMaxDiscountAmount() != null) {
            throw new ResourceInvalidException("Trần giảm giá tối đa chỉ áp dụng cho voucher theo phần trăm");
        }
        if (!existing.getCode().equals(dto.getCode()) && voucherRepository.existsByCode(dto.getCode())) {
            throw new ResourceInvalidException("Mã voucher đã tồn tại");
        }

        applyRequestToEntity(existing, dto);
        if (dto.getIsActive() != null) {
            existing.setIsActive(dto.getIsActive());
        }

        try {
            return voucherRepository.save(existing);
        } catch (Exception e) {
            log.error("Lỗi cập nhật voucher id={}", id, e);
            throw new ResourceInvalidException("Lỗi cập nhật voucher: " + e.getMessage());
        }
    }

    private void applyRequestToEntity(Voucher voucher, VoucherRequestDTO dto) throws ResourceInvalidException {
        voucher.setCode(dto.getCode());
        voucher.setType(dto.getType());
        voucher.setDiscountValue(dto.getDiscountValue());
        voucher.setMinimumOrderAmount(dto.getMinimumOrderAmount());
        voucher.setMaxUsage(dto.getMaxUsage());
        voucher.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        voucher.setStartDate(dto.getStartDate());
        voucher.setEndDate(dto.getEndDate());
        voucher.setIsFlashSale(dto.getIsFlashSale() != null && dto.getIsFlashSale());
        if (dto.getCategoryId() == null) {
            voucher.setApplicableCategory(null);
        } else {
            voucher.setApplicableCategory(categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceInvalidException("Danh mục không tồn tại")));
        }
    }

    /**
     * Admin dùng: xoá voucher — chỉ cho HARD DELETE khi voucher CHƯA từng được dùng (usedCount==0
     * và không có Order nào FK tới nó). Ngược lại, hướng dẫn dùng deactivate (PUT isActive=false)
     * thay vì xoá — theo đúng convention soft-delete đã dùng cho Product/User/Category trong dự án.
     * Voucher này có thể đã được 1 số user tự lưu vào ví (UserVoucher) mà CHƯA AI dùng — usedCount=0
     * đảm bảo mọi UserVoucher đó đều isUsed=false (không có cách nào isUsed=true mà usedCount không
     * tăng), nên dọn sạch các dòng ví chưa dùng này rồi mới xoá voucher, không cần chặn lại.
     */
    @Transactional
    public void deleteVoucher(Long id) throws ResourceInvalidException {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"));

        boolean used = (voucher.getUsedCount() != null && voucher.getUsedCount() > 0)
                || orderRepository.existsByVoucher_Id(id);
        if (used) {
            throw new ResourceInvalidException(
                    "Không thể xoá voucher đã từng được sử dụng — hãy vô hiệu hoá (tắt Đang hoạt động) thay vì xoá");
        }

        try {
            userVoucherRepository.deleteByVoucherId(id);
            voucherRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            // Guard usedCount/existsByVoucher_Id ở trên đã chặn phần lớn trường hợp, nhưng vẫn giữ lại
            // catch này cho các ràng buộc FK khác chưa lường hết — tránh lộ message DB kỹ thuật (tên
            // bảng/cột) thẳng ra response 500 cho client.
            log.warn("Xoá voucher id={} vi phạm ràng buộc dữ liệu: {}", id, e.getMessage());
            throw new ResourceInvalidException(
                    "Không thể xoá voucher này do còn dữ liệu liên quan — hãy vô hiệu hoá thay vì xoá");
        }
    }
}
