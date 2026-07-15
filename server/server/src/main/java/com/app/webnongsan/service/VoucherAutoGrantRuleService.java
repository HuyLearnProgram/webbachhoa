package com.app.webnongsan.service;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.VoucherAutoGrantRule;
import com.app.webnongsan.domain.request.VoucherAutoGrantRuleRequestDTO;
import com.app.webnongsan.repository.VoucherAutoGrantRuleRepository;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

// CRUD đơn giản cho admin cấu hình rule trao voucher tự động — không cần validate phức tạp như
// Voucher (không có code/ngày cụ thể, không có race condition cần atomic update).
@Service
@AllArgsConstructor
public class VoucherAutoGrantRuleService {
    private final VoucherAutoGrantRuleRepository ruleRepository;

    public List<VoucherAutoGrantRule> getAllRules() {
        return ruleRepository.findAllByOrderByAutoGrantTypeAsc();
    }

    public VoucherAutoGrantRule getRuleById(Long id) throws ResourceInvalidException {
        return ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Rule không tồn tại"));
    }

    public VoucherAutoGrantRule createRule(VoucherAutoGrantRuleRequestDTO dto) throws ResourceInvalidException {
        validate(dto);
        VoucherAutoGrantRule rule = new VoucherAutoGrantRule();
        applyRequestToEntity(rule, dto);
        return ruleRepository.save(rule);
    }

    public VoucherAutoGrantRule updateRule(Long id, VoucherAutoGrantRuleRequestDTO dto) throws ResourceInvalidException {
        VoucherAutoGrantRule existing = getRuleById(id);
        validate(dto);
        applyRequestToEntity(existing, dto);
        return ruleRepository.save(existing);
    }

    public void deleteRule(Long id) throws ResourceInvalidException {
        if (!ruleRepository.existsById(id))
            throw new ResourceInvalidException("Rule không tồn tại");
        ruleRepository.deleteById(id);
    }

    private void validate(VoucherAutoGrantRuleRequestDTO dto) throws ResourceInvalidException {
        if (dto.getDiscountType() == Voucher.VoucherType.FIXED && dto.getMaxDiscountAmount() != null) {
            throw new ResourceInvalidException("Trần giảm giá tối đa chỉ áp dụng cho loại phần trăm");
        }
        if (dto.getAutoGrantType() == AutoGrantType.MILESTONE && dto.getMilestoneOrderCount() == null) {
            throw new ResourceInvalidException("Loại MILESTONE bắt buộc phải có mốc số đơn");
        }
        if (dto.getAutoGrantType() != AutoGrantType.CART_RECOVERY && dto.getMinProductPrice() != null) {
            throw new ResourceInvalidException("Giá sản phẩm tối thiểu chỉ áp dụng cho loại Giỏ hàng bị bỏ quên");
        }
    }

    private void applyRequestToEntity(VoucherAutoGrantRule rule, VoucherAutoGrantRuleRequestDTO dto) {
        rule.setAutoGrantType(dto.getAutoGrantType());
        rule.setMilestoneOrderCount(dto.getAutoGrantType() == AutoGrantType.MILESTONE ? dto.getMilestoneOrderCount() : null);
        rule.setDiscountType(dto.getDiscountType());
        rule.setDiscountValue(dto.getDiscountValue());
        rule.setMinimumOrderAmount(dto.getMinimumOrderAmount());
        rule.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        rule.setValidityDays(dto.getValidityDays());
        rule.setCodePrefix(dto.getCodePrefix());
        rule.setMinProductPrice(dto.getAutoGrantType() == AutoGrantType.CART_RECOVERY ? dto.getMinProductPrice() : null);
        rule.setIsActive(dto.getIsActive() == null || dto.getIsActive());
    }
}
