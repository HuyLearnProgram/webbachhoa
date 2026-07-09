package com.app.webnongsan.repository;

import com.app.webnongsan.domain.ProductView;
import com.app.webnongsan.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductViewRepository extends JpaRepository<ProductView, Long> {
    @Modifying
    @Query("UPDATE ProductView pv SET pv.user = :user WHERE pv.sessionId = :sessionId AND pv.user IS NULL")
    int mergeSessionIntoUser(@Param("sessionId") String sessionId, @Param("user") User user);
}
