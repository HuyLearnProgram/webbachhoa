package com.app.webnongsan.controller;

import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.service.VoucherService;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v2/vouchers")
@AllArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    /**
     * Lấy tất cả voucher đang hoạt động
     */
    @GetMapping("/active")
    @ApiMessage("Get all active vouchers")
    public ResponseEntity<List<Voucher>> getActiveVouchers() {
        return ResponseEntity.ok(voucherService.getAllActiveVouchers());
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
     * Admin dùng: phân trang toàn bộ voucher hệ thống
     */
    @GetMapping
    @ApiMessage("Get all vouchers for admin")
    public ResponseEntity<PaginationDTO> getAllVouchers(Pageable pageable) {
        return ResponseEntity.ok(voucherService.getAllVouchers(pageable));
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
     * Admin dùng: Tạo voucher mới
     */
    @PostMapping
    @ApiMessage("Create new voucher")
    public ResponseEntity<Voucher> createVoucher(@RequestBody Voucher voucher) throws ResourceInvalidException {
        Voucher created = voucherService.createVoucher(voucher);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    @PutMapping("/{id}")
    @ApiMessage("Update voucher")
    public ResponseEntity<Voucher> updateVoucher(@PathVariable Long id, @RequestBody Voucher updatedVoucher) throws ResourceInvalidException {
        Voucher voucher = voucherService.updateVoucher(id, updatedVoucher);
        return ResponseEntity.ok(voucher);
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
     * Áp dụng voucher vào đơn hàng
     */
//    @PostMapping("/apply")
//    @ApiMessage("Apply voucher to order")
//    public ResponseEntity<Voucher> applyVoucher(
//            @RequestParam("code") String code,
//            @RequestParam("orderTotal") Double orderTotal
//    ) throws ResourceInvalidException {
//        Voucher voucher = voucherService.applyVoucherCode(code, orderTotal);
//        return ResponseEntity.ok(voucher);
//    }
}
