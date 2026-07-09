package com.app.webnongsan.repository;

import com.app.webnongsan.domain.SearchLog;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {
    @Modifying
    @Query("UPDATE SearchLog sl SET sl.user = :user WHERE sl.sessionId = :sessionId AND sl.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);
}
