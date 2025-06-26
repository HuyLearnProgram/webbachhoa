package com.app.webnongsan.service;

import com.app.webnongsan.domain.Feedback;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.feedback.FeedbackDTO;
import com.app.webnongsan.domain.response.product.ResProductDTO;
import com.app.webnongsan.repository.FeedbackRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class FeedbackService {
    private final FeedbackRepository feedbackRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public Feedback addFeedback(FeedbackDTO feedbackDTO) throws ResourceInvalidException {
        User u = userRepository.findById(feedbackDTO.getUserId()).orElseThrow(() -> new ResourceInvalidException("User không tồn tại"));
        if (u == null) throw new ResourceInvalidException("User không tồn tại");

        Product p = productRepository.findById(feedbackDTO.getProductId()).orElseThrow(() -> new ResourceInvalidException("Sản phẩm không tồn tại"));

        boolean exists = this.feedbackRepository.existsByUserIdAndProductId(u.getId(), p.getId());

        Feedback f;
        if (!exists) {
            f = new Feedback();
            f.setProduct(p);
            f.setUser(u);
            f.setDescription(feedbackDTO.getDescription());
            f.setStatus(0);
            f.setRatingStar(feedbackDTO.getRatingStar());
            this.feedbackRepository.save(f);
        } else {
            f = feedbackRepository.findByUserIdAndProductId(u.getId(), p.getId());
            f.setDescription(feedbackDTO.getDescription());
            f.setRatingStar(feedbackDTO.getRatingStar());
            this.feedbackRepository.save(f);
        }
        double averageRating = feedbackRepository.calculateAverageRatingByProductId(p.getId());
        p.setRating(averageRating);
        productRepository.save(p);

        return f;
    }

    public boolean checkValidFeedbackId(long id) {
        return this.feedbackRepository.existsById(id);
    }
    public long getTotalFeedbacksByProductId(Long productId){
        return this.feedbackRepository.countByProductId(productId);
    }
    public PaginationDTO getAll(Specification<Feedback> spec, Pageable pageable){
        Page<Feedback> feedbackPage = this.feedbackRepository.findAll(spec,pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber()+1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(feedbackPage.getTotalPages());
        meta.setTotal(feedbackPage.getTotalElements());

        p.setMeta(meta);

        List<FeedbackDTO> listFeedbacks = feedbackPage.getContent().stream().map(this::convertToFeedbackDTO).toList();
        p.setResult(listFeedbacks);
        return p;

    }

    public PaginationDTO getBySortAndFilter(Pageable pageable, Integer status, String sort) {
        if(sort != null){
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(sort).descending());
        }
        Page<Feedback> feedbackPage = this.feedbackRepository.findByStatus(status, pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(feedbackPage.getTotalPages());
        meta.setTotal(feedbackPage.getTotalElements());

        p.setMeta(meta);

        List<FeedbackDTO> listFeedback = feedbackPage.getContent().stream()
                .map(this::convertToFeedbackDTO).toList();
        p.setResult(listFeedback);
        return p;
    }

    public FeedbackDTO hideFeedback(Long id) throws ResourceInvalidException {

        Optional<Feedback> feedbackOptional = feedbackRepository.findById(id);
        Feedback f = new Feedback();
        FeedbackDTO feedbackDTO = new FeedbackDTO();
        if (feedbackOptional.isPresent()) {
            f = feedbackOptional.get();
            if(f.getStatus() == 0) f.setStatus(1);
            else f.setStatus(0);
            this.feedbackRepository.save(f);
            feedbackDTO.setId(f.getId());

            feedbackDTO.setUserAvatarUrl(f.getUser().getAvatarUrl());

            feedbackDTO.setProductId(f.getProduct().getId());
            feedbackDTO.setProduct_name(f.getProduct().getProductName());
            feedbackDTO.setImageUrl(f.getProduct().getImageUrl());

            feedbackDTO.setStatus(f.getStatus());
            feedbackDTO.setDescription(f.getDescription());
            feedbackDTO.setRatingStar(f.getRatingStar());
            feedbackDTO.setUpdatedAt(f.getUpdatedAt());
        }


        return feedbackDTO;
    }

    public PaginationDTO getByProductId(Long productId, Pageable pageable) {
        Page<Feedback> feedbackPage = this.feedbackRepository.findByProductId(productId, pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(feedbackPage.getTotalPages());
        meta.setTotal(feedbackPage.getTotalElements());

        p.setMeta(meta);

        List<FeedbackDTO> listFeedback = feedbackPage.getContent().stream()
                .map(this::convertToFeedbackDTO).toList();
        p.setResult(listFeedback);
        return p;
    }
    public FeedbackDTO convertToFeedbackDTO(Feedback feedback) {
        FeedbackDTO feedbackDTO = new FeedbackDTO();
        Optional<User> optionalUser = userRepository.findById(feedback.getUser().getId());
        if (optionalUser.isPresent()){
            User u = optionalUser.get();

            feedbackDTO.setId(feedback.getId());

            feedbackDTO.setUserId(u.getId());
            feedbackDTO.setUserName(u.getName());
            feedbackDTO.setUserAvatarUrl(feedback.getUser().getAvatarUrl());

            feedbackDTO.setProductId(feedback.getProduct().getId());
            feedbackDTO.setProduct_name(feedback.getProduct().getProductName());
            feedbackDTO.setImageUrl(feedback.getProduct().getImageUrl());

            feedbackDTO.setStatus(feedback.getStatus());
            feedbackDTO.setDescription(feedback.getDescription());
            feedbackDTO.setRatingStar(feedback.getRatingStar());
            feedbackDTO.setUpdatedAt(feedback.getUpdatedAt());
        }
        return feedbackDTO;
    }
}
