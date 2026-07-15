package com.app.webnongsan.controller;

import com.app.webnongsan.domain.LuckyDrawCampaign;
import com.app.webnongsan.domain.LuckyDrawPrize;
import com.app.webnongsan.domain.request.LuckyDrawCampaignRequestDTO;
import com.app.webnongsan.domain.request.LuckyDrawPrizeRequestDTO;
import com.app.webnongsan.domain.request.LuckyDrawSpinRequestDTO;
import com.app.webnongsan.domain.response.LuckyDrawSpinResultDTO;
import com.app.webnongsan.service.LuckyDrawService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.PermissionException;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class LuckyDrawController {
    private final LuckyDrawService luckyDrawService;

    /**
     * Quay thưởng may mắn sau khi đặt hàng — authenticated (ownership check trong service, không
     * nhận userId từ client). Không bao giờ nên ném lỗi 500 vì gamification — mọi lỗi nghiệp vụ trả
     * ResourceInvalidException (400) rõ ràng cho FE hiển thị.
     */
    @PostMapping("lucky-draw/spin")
    @ApiMessage("Spin lucky draw for an order")
    public ResponseEntity<LuckyDrawSpinResultDTO> spin(@Valid @RequestBody LuckyDrawSpinRequestDTO dto)
            throws ResourceInvalidException, PermissionException {
        return ResponseEntity.ok(luckyDrawService.spin(dto.getOrderId()));
    }

    // ===== Admin CRUD Campaign =====

    @GetMapping("admin/lucky-draw/campaigns")
    @ApiMessage("Get all lucky draw campaigns")
    public ResponseEntity<List<LuckyDrawCampaign>> getAllCampaigns() {
        return ResponseEntity.ok(luckyDrawService.getAllCampaigns());
    }

    @GetMapping("admin/lucky-draw/campaigns/{id}")
    @ApiMessage("Get lucky draw campaign by id")
    public ResponseEntity<LuckyDrawCampaign> getCampaignById(@PathVariable Long id) throws ResourceInvalidException {
        return ResponseEntity.ok(luckyDrawService.getCampaignById(id));
    }

    @PostMapping("admin/lucky-draw/campaigns")
    @ApiMessage("Create lucky draw campaign")
    public ResponseEntity<LuckyDrawCampaign> createCampaign(@Valid @RequestBody LuckyDrawCampaignRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(luckyDrawService.createCampaign(dto));
    }

    @PutMapping("admin/lucky-draw/campaigns/{id}")
    @ApiMessage("Update lucky draw campaign")
    public ResponseEntity<LuckyDrawCampaign> updateCampaign(@PathVariable Long id, @Valid @RequestBody LuckyDrawCampaignRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.ok(luckyDrawService.updateCampaign(id, dto));
    }

    @DeleteMapping("admin/lucky-draw/campaigns/{id}")
    @ApiMessage("Delete lucky draw campaign")
    public ResponseEntity<Void> deleteCampaign(@PathVariable Long id) throws ResourceInvalidException {
        luckyDrawService.deleteCampaign(id);
        return ResponseEntity.ok().build();
    }

    // ===== Admin CRUD Prize (lồng trong Campaign) =====

    @GetMapping("admin/lucky-draw/campaigns/{campaignId}/prizes")
    @ApiMessage("Get prizes of a campaign")
    public ResponseEntity<List<LuckyDrawPrize>> getPrizes(@PathVariable Long campaignId) {
        return ResponseEntity.ok(luckyDrawService.getPrizesByCampaign(campaignId));
    }

    @PostMapping("admin/lucky-draw/campaigns/{campaignId}/prizes")
    @ApiMessage("Create prize for a campaign")
    public ResponseEntity<LuckyDrawPrize> createPrize(@PathVariable Long campaignId, @Valid @RequestBody LuckyDrawPrizeRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.status(HttpStatus.CREATED).body(luckyDrawService.createPrize(campaignId, dto));
    }

    @PutMapping("admin/lucky-draw/prizes/{prizeId}")
    @ApiMessage("Update prize")
    public ResponseEntity<LuckyDrawPrize> updatePrize(@PathVariable Long prizeId, @Valid @RequestBody LuckyDrawPrizeRequestDTO dto) throws ResourceInvalidException {
        return ResponseEntity.ok(luckyDrawService.updatePrize(prizeId, dto));
    }

    @DeleteMapping("admin/lucky-draw/prizes/{prizeId}")
    @ApiMessage("Delete prize")
    public ResponseEntity<Void> deletePrize(@PathVariable Long prizeId) throws ResourceInvalidException {
        luckyDrawService.deletePrize(prizeId);
        return ResponseEntity.ok().build();
    }
}
