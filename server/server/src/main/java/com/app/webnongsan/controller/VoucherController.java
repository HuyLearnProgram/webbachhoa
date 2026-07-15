package com.app.webnongsan.controller;

import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.request.VoucherPreviewRequestDTO;
import com.app.webnongsan.domain.request.VoucherRequestDTO;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.voucher.VoucherPreviewResponseDTO;
import com.app.webnongsan.service.VoucherAutoGrantRuleService;
import com.app.webnongsan.service.VoucherService;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v2/vouchers")
@AllArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;
    private final VoucherAutoGrantRuleService voucherAutoGrantRuleService;

    /**
     * Lấy tất cả voucher đang hoạt động
     */
    @GetMapping("/active")
    @ApiMessage("Get all active vouchers")
    public ResponseEntity<List<Voucher>> getActiveVouchers() {
        return ResponseEntity.ok(voucherService.getAllActiveVouchers());
    }

    /**
     * Số tiền tối đa 1 tài khoản mới thực sự nhận được nếu đăng ký kèm mã giới thiệu hợp lệ
     * (WELCOME + 1 REFERRAL_REFEREE ngẫu nhiên, lấy trần cao nhất) — permitAll vì hiện ngay trên
     * trang đăng ký, trước khi user có tài khoản. Xem VoucherAutoGrantRuleService.getReferralMaxRewardAmount().
     */
    @GetMapping("/referral-max-reward")
    @ApiMessage("Get max referral reward amount for the register page")
    public ResponseEntity<Double> getReferralMaxRewardAmount() {
        return ResponseEntity.ok(voucherAutoGrantRuleService.getReferralMaxRewardAmount());
    }

    /**
     * Voucher đang hiển thị trên banner Flash Sale trang chủ — permitAll, guest cũng thấy được.
     */
    @GetMapping("/flash-sale")
    @ApiMessage("Get flash-sale vouchers")
    public ResponseEntity<List<Voucher>> getFlashSaleVouchers() {
        return ResponseEntity.ok(voucherService.getFlashSaleVouchers());
    }

    /**
     * Lấy voucher của user hiện tại (phân trang)
     */
    @GetMapping("/my")
    @ApiMessage("Get current user's vouchers")
    public ResponseEntity<PaginationDTO> getMyVouchers(Pageable pageable) throws ResourceInvalidException {
        return ResponseEntity.ok(voucherService.getVouchersOfCurrentUser(pageable));
    }

    /**
     * Tổng tiền user hiện tại đã tiết kiệm được nhờ voucher — hiện ở trang "Ví voucher".
     */
    @GetMapping("/my-savings")
    @ApiMessage("Get current user's total voucher savings")
    public ResponseEntity<Double> getMySavings() throws ResourceInvalidException {
        return ResponseEntity.ok(voucherService.getMySavings());
    }

    /**
     * Admin dùng: phân trang toàn bộ voucher hệ thống
     */
    @GetMapping
    @ApiMessage("Get all vouchers for admin")
    public ResponseEntity<PaginationDTO> getAllVouchers(@Filter Specification<Voucher> spec, Pageable pageable) {
        return ResponseEntity.ok(voucherService.getAllVouchers(spec, pageable));
    }

    /**
     * Gán voucher cho người dùng hiện tại
     */
    @PostMapping("/assign")
    @ApiMessage("Assign voucher to current user")
    public ResponseEntity<Void> assignVoucher(@RequestParam("id") Long voucherId) throws ResourceInvalidException {
        voucherService.assignVoucherToCurrentUser(voucherId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    /**
     * Admin dùng: lấy 1 voucher theo id (phục vụ trang sửa)
     */
    @GetMapping("/{id}")
    @ApiMessage("Get voucher by id")
    public ResponseEntity<Voucher> getVoucherById(@PathVariable Long id) throws ResourceInvalidException {
        return ResponseEntity.ok(voucherService.getVoucherById(id));
    }

    /**
     * Admin dùng: Tạo voucher mới
     */
    @PostMapping
    @ApiMessage("Create new voucher")
    public ResponseEntity<Voucher> createVoucher(@Valid @RequestBody VoucherRequestDTO dto) throws ResourceInvalidException {
        Voucher created = voucherService.createVoucher(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    @PutMapping("/{id}")
    @ApiMessage("Update voucher")
    public ResponseEntity<Voucher> updateVoucher(@PathVariable Long id, @Valid @RequestBody VoucherRequestDTO dto) throws ResourceInvalidException {
        Voucher voucher = voucherService.updateVoucher(id, dto);
        return ResponseEntity.ok(voucher);
    }

    /**
     * Admin dùng: xoá voucher (chỉ cho phép nếu chưa từng được sử dụng — xem VoucherService.deleteVoucher)
     */
    @DeleteMapping("/{id}")
    @ApiMessage("Delete voucher")
    public ResponseEntity<Void> deleteVoucher(@PathVariable Long id) throws ResourceInvalidException {
        voucherService.deleteVoucher(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Xóa voucher khỏi tài khoản user
     */
    @DeleteMapping("/remove")
    @ApiMessage("Remove voucher from current user")
    public ResponseEntity<Void> removeVoucher(@RequestParam("id") Long voucherId) throws ResourceInvalidException {
        voucherService.removeVoucherFromCurrentUser(voucherId);
        return ResponseEntity.ok().build();
    }

    /**
     * Preview/validate voucher trước khi đặt hàng (không mutate state) — dùng chung cho cả 2 luồng
     * chọn-từ-danh-sách và nhập-tay ở Checkout.
     */
    @PostMapping("/preview")
    @ApiMessage("Preview/validate voucher before checkout")
    public ResponseEntity<VoucherPreviewResponseDTO> previewVoucher(@Valid @RequestBody VoucherPreviewRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.ok(voucherService.previewVoucher(dto));
    }
}
