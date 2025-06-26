package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;

import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.voucher.VoucherDTO;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.PaginationHelper;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;


import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final UserRepository userRepository;
    private final PaginationHelper paginationHelper;

    /**
     * Lấy danh sách voucher đang hoạt động
     */
    public List<Voucher> getAllActiveVouchers() {
        return voucherRepository.findAllActiveVouchers(Instant.now());
    }

    /**
     * Phân trang danh sách voucher của admin
     */
    public PaginationDTO getAllVouchers(Pageable pageable) {
        Page<Voucher> page = voucherRepository.findAllByIsActiveTrue(pageable);
        return paginationHelper.fetchAllEntities(page);
    }

    /**
     * Lấy các voucher người dùng hiện có (chưa dùng)
     */
    public PaginationDTO getVouchersOfCurrentUser(Pageable pageable) throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();

        Page<UserVoucher> userVoucherPage = userVoucherRepository.findActiveUserVouchers(user.getId(), pageable);

        // Ánh xạ sang DTO
        Page<VoucherDTO> dtoPage = userVoucherPage.map(uv -> {
            Voucher v = uv.getVoucher();
            VoucherDTO dto = new VoucherDTO(
                    v.getId(),
                    v.getCode(),
                    v.getType().name(),
                    v.getDiscountValue(),
                    v.getMinimumOrderAmount(),
                    v.getMaxUsage(),
                    v.getUsedCount(),
                    v.getIsActive(),
                    v.getStartDate(),
                    v.getEndDate(),
                    uv.getIsUsed(),
                    uv.getAssignedAt()
            );
            return dto;
        });

        return paginationHelper.fetchAllEntities(dtoPage);
    }




    /**
     * Áp dụng voucher theo mã (check điều kiện hợp lệ)
     */
    private double applyVoucherToOrder(Order order, OrderDTO orderDTO, User user, double totalBeforeDiscount)
            throws ResourceInvalidException {
        Long voucherId = orderDTO.getVoucherId();
        if (voucherId == null) return totalBeforeDiscount;

        Optional<UserVoucher> optional = userVoucherRepository
                .findByUserIdAndVoucherId(user.getId(), voucherId);

        if (optional.isEmpty())
            throw new ResourceInvalidException("Voucher không tồn tại hoặc không thuộc về người dùng");

        UserVoucher userVoucher = optional.get();
        Voucher voucher = userVoucher.getVoucher();

        if (Boolean.TRUE.equals(userVoucher.getIsUsed()))
            throw new ResourceInvalidException("Mã giảm giá đã được sử dụng");

        if (!Boolean.TRUE.equals(voucher.getIsActive()))
            throw new ResourceInvalidException("Mã giảm giá đã hết hạn hoặc không hoạt động");

        if (voucher.getMinimumOrderAmount() != null && totalBeforeDiscount < voucher.getMinimumOrderAmount())
            throw new ResourceInvalidException("Đơn hàng không đủ điều kiện áp dụng mã giảm giá");

        // Áp dụng và đánh dấu
        userVoucher.setIsUsed(true);
        userVoucherRepository.save(userVoucher);

        double discountedTotal;
        if ("PERCENT".equalsIgnoreCase(voucher.getType().name())) {
            discountedTotal = totalBeforeDiscount * (1 - voucher.getDiscountValue() / 100);
        } else {
            discountedTotal = totalBeforeDiscount - voucher.getDiscountValue();
        }

        return Math.max(discountedTotal, 0);
    }


    /**
     * Gán voucher cho người dùng hiện tại (nếu chưa có)
     */
    @Transactional
    public void assignVoucherToCurrentUser(Long voucherId) throws ResourceInvalidException {
        User user = getCurrentUserOrThrow();

        if (!voucherRepository.existsById(voucherId))
            throw new ResourceInvalidException("Voucher không tồn tại");

        boolean alreadyAssigned = userVoucherRepository.existsByUserIdAndVoucherId(user.getId(), voucherId);
        if (alreadyAssigned)
            throw new ResourceInvalidException("Bạn đã có voucher này rồi");

        UserVoucher userVoucher = new UserVoucher();
        userVoucher.setUser(user);
        userVoucher.setVoucher(voucherRepository.findById(voucherId).get());
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

    /**
     * Đánh dấu đã sử dụng voucher
     */
    @Transactional
    public void markVoucherAsUsed(Long userId, Long voucherId) {
        Optional<UserVoucher> uvOpt = userVoucherRepository.findByUserIdAndVoucherId(userId, voucherId);
        uvOpt.ifPresent(userVoucher -> {
            userVoucher.setIsUsed(true);
            userVoucherRepository.save(userVoucher);

            Voucher voucher = userVoucher.getVoucher();
            if (voucher.getUsedCount() == null) voucher.setUsedCount(1);
            else voucher.setUsedCount(voucher.getUsedCount() + 1);
            voucherRepository.save(voucher);
        });
    }

    private User getCurrentUserOrThrow() throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().orElse("");
        User user = userRepository.findByEmail(email);
        if (user == null) throw new ResourceInvalidException("User không tồn tại");
        return user;
    }

    public Voucher createVoucher(Voucher voucher) throws ResourceInvalidException {
        if (voucherRepository.existsByCode(voucher.getCode())) {
            throw new ResourceInvalidException("Mã voucher đã tồn tại");
        }

        if (voucher.getStartDate() != null && voucher.getEndDate() != null
                && !voucher.getEndDate().isAfter(voucher.getStartDate())) {
            throw new ResourceInvalidException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }

        voucher.setUsedCount(0);
        voucher.setIsActive(true); // Default là active

        return voucherRepository.save(voucher);
    }

    public Voucher updateVoucher(Long id, Voucher updated) throws ResourceInvalidException {
        Voucher existing = voucherRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"));

        existing.setCode(updated.getCode());
        existing.setType(updated.getType());
        existing.setDiscountValue(updated.getDiscountValue());
        existing.setMinimumOrderAmount(updated.getMinimumOrderAmount());
        existing.setMaxUsage(updated.getMaxUsage());

        // Cập nhật endDate nếu không null
        if (updated.getEndDate() != null) {
            if (existing.getStartDate() != null && updated.getEndDate().isBefore(existing.getStartDate())) {
                throw new ResourceInvalidException("Thời gian kết thúc phải sau thời gian bắt đầu");
            }
            existing.setEndDate(updated.getEndDate());
        }
        if (updated.getIsActive() != null) {
            existing.setIsActive(updated.getIsActive());
        }

        try {
            return voucherRepository.save(existing);
        } catch (Exception e) {
            e.printStackTrace(); // hoặc dùng log.error
            throw new ResourceInvalidException("Lỗi cập nhật voucher: " + e.getMessage());
        }
    }

    private VoucherDTO mapToVoucherDTO(UserVoucher uv) {
        Voucher v = uv.getVoucher();
        VoucherDTO dto = new VoucherDTO();
        dto.setId(v.getId());
        dto.setCode(v.getCode());
        dto.setType(v.getType().name());
        dto.setDiscountValue(v.getDiscountValue());
        dto.setMinimumOrderAmount(v.getMinimumOrderAmount());
        dto.setMaxUsage(v.getMaxUsage());
        dto.setUsedCount(v.getUsedCount());
        dto.setIsActive(v.getIsActive());
        dto.setStartDate(v.getStartDate());
        dto.setEndDate(v.getEndDate());
        return dto;
    }

}
