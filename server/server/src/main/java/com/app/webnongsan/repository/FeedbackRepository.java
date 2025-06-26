package com.app.webnongsan.repository;

import com.app.webnongsan.domain.Feedback;
import com.app.webnongsan.domain.response.feedback.FeedbackDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback,Long>, JpaSpecificationExecutor<Feedback> {
    @Query("SELECT COUNT(f) > 0 FROM Feedback f WHERE f.user.id = :userId AND f.product.id = :productId")
    boolean existsByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);
    long countByProductId(Long productId);
    @Query("SELECT f FROM Feedback f WHERE f.user.id = :userId AND f.product.id = :productId")
    Feedback findByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);
    @Query("SELECT f FROM Feedback f WHERE (:status IS NULL OR f.status = :status)")
    Page<Feedback> findByStatus(Integer status, Pageable pageable);
    Page<Feedback> findByProductId(Long productId, Pageable pageable);
    @Query("SELECT AVG(f.ratingStar) FROM Feedback f WHERE f.product.id = :productId")
    double calculateAverageRatingByProductId(@Param("productId") Long productId);

}
