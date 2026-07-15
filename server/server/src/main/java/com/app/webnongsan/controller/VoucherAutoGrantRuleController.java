package com.app.webnongsan.controller;

import com.app.webnongsan.domain.VoucherAutoGrantRule;
import com.app.webnongsan.domain.request.VoucherAutoGrantRuleRequestDTO;
import com.app.webnongsan.service.VoucherAutoGrantRuleService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Admin dùng để cấu hình rule trao voucher tự động (welcome/first-order/milestone/cart-recovery/
// birthday/win-back/referral/lucky-draw) — bảo vệ ADMIN qua SecurityConfiguration.java (path
// admin/voucher-auto-grant-rules/**, khai riêng từng HttpMethod theo đúng lesson đã ghi CLAUDE.md).
@RestController
@RequestMapping("api/v2/admin/voucher-auto-grant-rules")
@AllArgsConstructor
public class VoucherAutoGrantRuleController {

    private final VoucherAutoGrantRuleService ruleService;

    @GetMapping
    @ApiMessage("Get all voucher auto-grant rules")
    public ResponseEntity<List<VoucherAutoGrantRule>> getAllRules() {
        return ResponseEntity.ok(ruleService.getAllRules());
    }

    @GetMapping("/{id}")
    @ApiMessage("Get voucher auto-grant rule by id")
    public ResponseEntity<VoucherAutoGrantRule> getRuleById(@PathVariable Long id) throws ResourceInvalidException {
        return ResponseEntity.ok(ruleService.getRuleById(id));
    }

    @PostMapping
    @ApiMessage("Create voucher auto-grant rule")
    public ResponseEntity<VoucherAutoGrantRule> createRule(@Valid @RequestBody VoucherAutoGrantRuleRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.status(HttpStatus.CREATED).body(ruleService.createRule(dto));
    }

    @PutMapping("/{id}")
    @ApiMessage("Update voucher auto-grant rule")
    public ResponseEntity<VoucherAutoGrantRule> updateRule(@PathVariable Long id, @Valid @RequestBody VoucherAutoGrantRuleRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.ok(ruleService.updateRule(id, dto));
    }

    @DeleteMapping("/{id}")
    @ApiMessage("Delete voucher auto-grant rule")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) throws ResourceInvalidException {
        ruleService.deleteRule(id);
        return ResponseEntity.ok().build();
    }
}
