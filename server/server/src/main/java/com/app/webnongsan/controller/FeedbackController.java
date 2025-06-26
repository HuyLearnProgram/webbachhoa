package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Feedback;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.feedback.FeedbackDTO;
import com.app.webnongsan.repository.FeedbackRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.service.FeedbackService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class FeedbackController {
    private final FeedbackService feedbackService;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;

    @PutMapping("product/ratings")
    @ApiMessage("Create a feedback")
    public ResponseEntity<Feedback> add(@RequestBody FeedbackDTO feedbackDTO) throws ResourceInvalidException{
        return ResponseEntity.status(HttpStatus.CREATED).body(this.feedbackService.addFeedback(feedbackDTO));
    }

    @GetMapping("product/ratings/{id}")
    @ApiMessage("Get feedbacks by product")
    public ResponseEntity<PaginationDTO> getByProductId(
            @PathVariable Long id,
            @RequestParam(value = "size",required = false) Integer size,
            Pageable pageable) {
        if(size == null || size < 1){
            long totalEls = this.feedbackService.getTotalFeedbacksByProductId(id);
            size = totalEls > 0 ? (int) totalEls : 1;
        }
        Pageable updatePageable = PageRequest.of(pageable.getPageNumber(),size);
        return ResponseEntity.ok(this.feedbackService.getByProductId(id, updatePageable));
    }

    @GetMapping("product/ratings")
    @ApiMessage("Get All feedbacks By Status")
    public ResponseEntity<PaginationDTO> getAllByStatus(
            Pageable pageable,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "sort", required = false) String sort){
        return ResponseEntity.ok(this.feedbackService.getBySortAndFilter(pageable,status,sort));
    }

    @PutMapping("ratings/{id}")
    @ApiMessage("Hide a feedback")
    public ResponseEntity<FeedbackDTO> hideFeedback(@PathVariable Long id) throws ResourceInvalidException{
        return ResponseEntity.status(HttpStatus.CREATED).body(this.feedbackService.hideFeedback(id));
    }
}
