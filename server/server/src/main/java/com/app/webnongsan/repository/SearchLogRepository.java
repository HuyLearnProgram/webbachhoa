package com.app.webnongsan.repository;

import com.app.webnongsan.domain.SearchLog;
import com.app.webnongsan.domain.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {
    @Modifying
    @Query("UPDATE SearchLog sl SET sl.user = :user WHERE sl.sessionId = :sessionId AND sl.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);

    // ===== Smart Search Phase C — metrics "Chất lượng tìm kiếm" (thuần Java, sống độc lập Python) =====

    // [mode, tổng lượt, lượt có click, vị trí click trung bình] theo search_mode (null = đường LIKE cũ)
    @Query("SELECT sl.searchMode, COUNT(sl), " +
            "SUM(CASE WHEN sl.clickedProductId IS NOT NULL THEN 1 ELSE 0 END), AVG(sl.clickedPosition) " +
            "FROM SearchLog sl WHERE sl.searchedAt >= :since GROUP BY sl.searchMode")
    List<Object[]> aggregateByMode(@Param("since") Instant since);

    long countBySearchedAtGreaterThanEqual(Instant since);

    long countBySearchedAtGreaterThanEqualAndResultCount(Instant since, int resultCount);

    // Semantic rescue: LIKE rỗng nhưng vẫn có kết quả nhờ semantic — giá trị cốt lõi của Smart Search
    @Query("SELECT COUNT(sl) FROM SearchLog sl WHERE sl.searchedAt >= :since " +
            "AND sl.lexicalEmpty = true AND sl.resultCount > 0")
    long countRescuedSince(@Param("since") Instant since);

    // Top từ khoá 0 kết quả — "mỏ vàng" biết khách muốn gì mà cửa hàng chưa bán/đặt tên chưa khớp
    @Query("SELECT sl.keywordNormalized, MAX(sl.keyword), COUNT(sl) FROM SearchLog sl " +
            "WHERE sl.searchedAt >= :since AND sl.resultCount = 0 AND sl.keywordNormalized <> '' " +
            "GROUP BY sl.keywordNormalized ORDER BY COUNT(sl) DESC")
    List<Object[]> topZeroResultKeywords(@Param("since") Instant since, Pageable pageable);

    // ===== Autocomplete "Mọi người cũng tìm" =====
    // Match prefix trên keyword_normalized (ăn index idx_sl_keyword_norm — prefix đã strip dấu
    // client-side, né bug dấu query param bằng thiết kế). HAVING COUNT>=2: không gợi ý keyword
    // đơn lẻ (vừa chất lượng vừa tránh lộ query cá biệt của người khác); MAX(result_count)>0:
    // không gợi ý keyword từng toàn 0 kết quả. Trả bản CÓ DẤU (MAX(keyword) — biến thể "lớn
    // nhất" theo collation, chấp nhận đơn giản hoá thay vì đếm biến thể phổ biến nhất).
    @Query("SELECT MAX(sl.keyword) FROM SearchLog sl " +
            "WHERE sl.keywordNormalized LIKE CONCAT(:prefix, '%') " +
            "GROUP BY sl.keywordNormalized HAVING COUNT(sl) >= 2 AND MAX(sl.resultCount) > 0 " +
            "ORDER BY COUNT(sl) DESC")
    List<String> suggestKeywords(@Param("prefix") String prefix, Pageable pageable);
}
