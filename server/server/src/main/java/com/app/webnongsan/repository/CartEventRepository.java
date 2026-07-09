package com.app.webnongsan.repository;

import com.app.webnongsan.domain.CartEvent;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CartEventRepository extends JpaRepository<CartEvent, Long> {
    @Modifying
    @Query("UPDATE CartEvent ce SET ce.user = :user WHERE ce.sessionId = :sessionId AND ce.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);
}
