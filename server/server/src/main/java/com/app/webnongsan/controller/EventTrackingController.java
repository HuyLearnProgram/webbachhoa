package com.app.webnongsan.controller;

import com.app.webnongsan.domain.request.*;
import com.app.webnongsan.service.EventTrackingService;
import com.app.webnongsan.util.annotation.ApiMessage;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Endpoint ghi nhận hành vi người dùng cho hệ thống gợi ý AI.
// Tất cả đều permitAll (guest tracking qua sessionId ẩn danh) — xem SecurityConfiguration.
@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class EventTrackingController {
    private final EventTrackingService eventTrackingService;

    @PostMapping("events/product-view")
    @ApiMessage("Track product view")
    public ResponseEntity<Void> trackProductView(@Valid @RequestBody TrackProductViewDTO dto) {
        this.eventTrackingService.trackProductView(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(null);
    }

    @PostMapping("events/search")
    @ApiMessage("Track search")
    public ResponseEntity<Long> trackSearch(@Valid @RequestBody TrackSearchDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(this.eventTrackingService.trackSearch(dto));
    }

    @PostMapping("events/cart")
    @ApiMessage("Track cart event")
    public ResponseEntity<Void> trackCartEvent(@Valid @RequestBody TrackCartEventDTO dto) {
        this.eventTrackingService.trackCartEvent(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(null);
    }

    @PostMapping("events/recommendation-impressions")
    @ApiMessage("Track recommendation impressions")
    public ResponseEntity<Void> trackImpressions(@Valid @RequestBody TrackImpressionBatchDTO dto) {
        this.eventTrackingService.trackImpressions(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(null);
    }

    @PostMapping("events/recommendation-click")
    @ApiMessage("Track recommendation click")
    public ResponseEntity<Void> trackRecommendationClick(@Valid @RequestBody TrackRecommendationClickDTO dto) {
        this.eventTrackingService.trackRecommendationClick(dto);
        return ResponseEntity.ok(null);
    }

    @PostMapping("events/session-merge")
    @ApiMessage("Merge anonymous session into user")
    public ResponseEntity<Void> mergeSession(@Valid @RequestBody SessionMergeDTO dto) {
        this.eventTrackingService.mergeSessionIntoCurrentUser(dto.getSessionId());
        return ResponseEntity.ok(null);
    }
}
