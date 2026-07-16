package com.app.webnongsan.service;

import com.app.webnongsan.domain.LuckyDrawCampaign;
import com.app.webnongsan.domain.LuckyDrawPrize;
import com.app.webnongsan.domain.LuckyDrawSpin;
import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.Voucher;
import com.app.webnongsan.domain.request.LuckyDrawCampaignRequestDTO;
import com.app.webnongsan.domain.request.LuckyDrawPrizeRequestDTO;
import com.app.webnongsan.domain.response.LuckyDrawSpinResultDTO;
import com.app.webnongsan.repository.LuckyDrawCampaignRepository;
import com.app.webnongsan.repository.LuckyDrawPrizeRepository;
import com.app.webnongsan.repository.LuckyDrawSpinRepository;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.repository.VoucherAutoGrantRuleRepository;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.PermissionException;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

// Rút thăm may mắn sau đơn hàng (Phase 7, nặng nhất trong hệ trao voucher tự động) — xem CLAUDE.md.
@Service
@AllArgsConstructor
public class LuckyDrawService {
    private static final Logger log = LoggerFactory.getLogger(LuckyDrawService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final LuckyDrawCampaignRepository campaignRepository;
    private final LuckyDrawPrizeRepository prizeRepository;
    private final LuckyDrawSpinRepository spinRepository;
    private final VoucherAutoGrantRuleRepository ruleRepository;
    private final OrderRepository orderRepository;
    private final VoucherGrantService voucherGrantService;

    /**
     * Quay thưởng cho 1 đơn hàng — trigger ngay sau khi tạo đơn thành công (cả COD lẫn VNPay, không
     * chờ PAID, đúng tinh thần "đơn hàng thể hiện ý định mua" đã dùng cho attribution gợi ý AI).
     */
    public LuckyDrawSpinResultDTO spin(Long orderId) throws ResourceInvalidException, PermissionException {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceInvalidException("Đơn hàng không tồn tại"));

        String actorEmail = SecurityUtil.getCurrentUserLogin().orElse(null);
        boolean isOwner = actorEmail != null && actorEmail.equalsIgnoreCase(order.getUser().getEmail());
        if (!isOwner) {
            throw new PermissionException("Bạn không có quyền quay thưởng cho đơn hàng này");
        }

        Optional<LuckyDrawCampaign> campaignOpt = campaignRepository.findFirstActiveCampaign(Instant.now());
        if (campaignOpt.isEmpty()) {
            throw new ResourceInvalidException("Hiện không có chương trình rút thăm nào đang diễn ra");
        }
        LuckyDrawCampaign campaign = campaignOpt.get();

        if (campaign.getMinOrderAmount() != null && order.getTotal_price() < campaign.getMinOrderAmount()) {
            throw new ResourceInvalidException("Đơn hàng chưa đạt giá trị tối thiểu để quay thưởng");
        }

        // Chặn quay 2 lần/đơn — insert trước, bắt lỗi trùng (atomic, không cần lock)
        LuckyDrawSpin spin = new LuckyDrawSpin();
        spin.setCampaign(campaign);
        spin.setUser(order.getUser());
        spin.setOrderId(orderId);
        try {
            spinRepository.saveAndFlush(spin);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInvalidException("Đơn hàng này đã được quay thưởng rồi");
        }

        LuckyDrawPrize prize = pickWeightedPrize(campaign.getId());
        if (prize == null) {
            return new LuckyDrawSpinResultDTO(false, "Chúc bạn may mắn lần sau", null);
        }

        // Trừ số lượng atomic — nếu thua race (hết đúng lúc), fallback "trượt" thay vì retry phức tạp
        if (prize.getTotalQuantity() != null) {
            int affected = prizeRepository.decrementRemainingIfAvailable(prize.getId());
            if (affected == 0) {
                return new LuckyDrawSpinResultDTO(false, "Chúc bạn may mắn lần sau", null);
            }
        }

        spin.setPrize(prize);
        try {
            spinRepository.save(spin);
        } catch (Exception e) {
            // Giải đã bị trừ số lượng ở bước trên (nếu có giới hạn) nhưng gắn vào lượt quay này thất
            // bại — hoàn lại số lượng ngay để giải không "biến mất" vĩnh viễn không ai nhận được.
            if (prize.getTotalQuantity() != null) {
                prizeRepository.incrementRemainingBack(prize.getId());
            }
            log.error("Lucky Draw: lỗi lưu kết quả quay cho orderId={}, đã hoàn lại số lượng giải id={}: {}",
                    orderId, prize.getId(), e.getMessage());
            throw new ResourceInvalidException("Có lỗi khi ghi nhận kết quả quay thưởng, vui lòng thử lại");
        }

        if (prize.getVoucherAutoGrantRule() == null) {
            return new LuckyDrawSpinResultDTO(true, prize.getLabel(), null);
        }

        try {
            Voucher voucher = voucherGrantService.grantSpecificRule(
                    order.getUser(), prize.getVoucherAutoGrantRule(), "orderId:" + orderId);
            return new LuckyDrawSpinResultDTO(true, prize.getLabel(), voucher != null ? voucher.getCode() : null);
        } catch (Exception e) {
            log.warn("Lucky Draw: lỗi trao voucher cho prize={}: {}", prize.getId(), e.getMessage());
            return new LuckyDrawSpinResultDTO(true, prize.getLabel(), null);
        }
    }

    // Chọn giải có trọng số trong số các giải còn số lượng (hoặc không giới hạn) — cumulative weight
    private LuckyDrawPrize pickWeightedPrize(Long campaignId) {
        List<LuckyDrawPrize> available = prizeRepository.findAvailableByCampaignId(campaignId);
        if (available.isEmpty()) return null;

        int totalWeight = available.stream().mapToInt(p -> p.getProbabilityWeight() == null ? 0 : p.getProbabilityWeight()).sum();
        if (totalWeight <= 0) return null;

        int roll = RANDOM.nextInt(totalWeight);
        int cumulative = 0;
        for (LuckyDrawPrize p : available) {
            cumulative += p.getProbabilityWeight() == null ? 0 : p.getProbabilityWeight();
            if (roll < cumulative) return p;
        }
        return available.get(available.size() - 1); // an toàn, không nên tới đây
    }

    // ===== Admin CRUD =====

    public List<LuckyDrawCampaign> getAllCampaigns() {
        return campaignRepository.findAllByOrderByIdDesc();
    }

    public LuckyDrawCampaign getCampaignById(Long id) throws ResourceInvalidException {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceInvalidException("Chiến dịch không tồn tại"));
    }

    public LuckyDrawCampaign createCampaign(LuckyDrawCampaignRequestDTO dto) {
        LuckyDrawCampaign campaign = new LuckyDrawCampaign();
        applyRequestToEntity(campaign, dto);
        return campaignRepository.save(campaign);
    }

    public LuckyDrawCampaign updateCampaign(Long id, LuckyDrawCampaignRequestDTO dto) throws ResourceInvalidException {
        LuckyDrawCampaign campaign = getCampaignById(id);
        applyRequestToEntity(campaign, dto);
        return campaignRepository.save(campaign);
    }

    public void deleteCampaign(Long id) throws ResourceInvalidException {
        if (!campaignRepository.existsById(id))
            throw new ResourceInvalidException("Chiến dịch không tồn tại");
        campaignRepository.deleteById(id);
    }

    private void applyRequestToEntity(LuckyDrawCampaign campaign, LuckyDrawCampaignRequestDTO dto) {
        campaign.setName(dto.getName());
        campaign.setStartDate(dto.getStartDate());
        campaign.setEndDate(dto.getEndDate());
        campaign.setMinOrderAmount(dto.getMinOrderAmount());
        campaign.setIsActive(dto.getIsActive() == null || dto.getIsActive());
    }

    public List<LuckyDrawPrize> getPrizesByCampaign(Long campaignId) {
        return prizeRepository.findByCampaignId(campaignId);
    }

    public LuckyDrawPrize createPrize(Long campaignId, LuckyDrawPrizeRequestDTO dto) throws ResourceInvalidException {
        LuckyDrawCampaign campaign = getCampaignById(campaignId);
        LuckyDrawPrize prize = new LuckyDrawPrize();
        prize.setCampaign(campaign);
        applyRequestToEntity(prize, dto);
        prize.setRemainingQuantity(dto.getTotalQuantity());
        return prizeRepository.save(prize);
    }

    public LuckyDrawPrize updatePrize(Long prizeId, LuckyDrawPrizeRequestDTO dto) throws ResourceInvalidException {
        LuckyDrawPrize prize = prizeRepository.findById(prizeId)
                .orElseThrow(() -> new ResourceInvalidException("Giải thưởng không tồn tại"));
        applyRequestToEntity(prize, dto);
        // Chỉ reset remainingQuantity nếu admin đổi totalQuantity (giữ nguyên số đã phát nếu không đổi)
        if (!java.util.Objects.equals(prize.getTotalQuantity(), dto.getTotalQuantity())) {
            prize.setRemainingQuantity(dto.getTotalQuantity());
        }
        return prizeRepository.save(prize);
    }

    public void deletePrize(Long prizeId) throws ResourceInvalidException {
        if (!prizeRepository.existsById(prizeId))
            throw new ResourceInvalidException("Giải thưởng không tồn tại");
        prizeRepository.deleteById(prizeId);
    }

    private void applyRequestToEntity(LuckyDrawPrize prize, LuckyDrawPrizeRequestDTO dto) throws ResourceInvalidException {
        prize.setLabel(dto.getLabel());
        prize.setProbabilityWeight(dto.getProbabilityWeight());
        prize.setTotalQuantity(dto.getTotalQuantity());
        if (dto.getVoucherAutoGrantRuleId() != null) {
            prize.setVoucherAutoGrantRule(ruleRepository.findById(dto.getVoucherAutoGrantRuleId())
                    .orElseThrow(() -> new ResourceInvalidException("Rule voucher không tồn tại")));
        } else {
            prize.setVoucherAutoGrantRule(null);
        }
    }
}
