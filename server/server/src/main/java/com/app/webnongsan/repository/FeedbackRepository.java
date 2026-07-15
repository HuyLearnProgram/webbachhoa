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

import java.time.Instant;
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
    @Query("SELECT f FROM Feedback f WHERE (:status IS NULL OR f.status = :status) " +
            "AND (:productName IS NULL OR LOWER(f.product.productName) LIKE LOWER(CONCAT('%', :productName, '%')))")
    Page<Feedback> findByStatusAndProductName(@Param("status") Integer status, @Param("productName") String productName, Pageable pageable);
    Page<Feedback> findByProductId(Long productId, Pageable pageable);
    long countByUser_Id(Long userId);
    Page<Feedback> findByUser_Id(Long userId, Pageable pageable);
    @Query("SELECT AVG(f.ratingStar) FROM Feedback f WHERE f.product.id = :productId")
    double calculateAverageRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT AVG(f.ratingStar) FROM Feedback f")
    Double calculateGlobalAverageRating();

    @Query("SELECT f.ratingStar, COUNT(f) FROM Feedback f GROUP BY f.ratingStar")
    List<Object[]> countGroupByRatingStar();

    // Bản lọc theo tháng/năm của query trên — dùng cho biểu đồ "Phân bố đánh giá theo sao" ở Overview
    // admin khi chọn tháng cụ thể, TÁCH RIÊNG khỏi countGroupByRatingStar() (2 stat card "Đánh giá
    // trung bình"/"Đánh giá đang bị ẩn" vẫn giữ nguyên số liệu toàn thời gian, không bị ảnh hưởng).
    @Query("SELECT f.ratingStar, COUNT(f) FROM Feedback f WHERE f.timestamp >= :start AND f.timestamp < :end GROUP BY f.ratingStar")
    List<Object[]> countGroupByRatingStarAndMonth(@Param("start") Instant start, @Param("end") Instant end);

    long countByStatus(int status);

}
