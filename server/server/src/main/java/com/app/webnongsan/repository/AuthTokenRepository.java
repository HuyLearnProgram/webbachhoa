package com.app.webnongsan.repository;

import com.app.webnongsan.domain.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {
    public boolean existsByTokenAndEmail(String token, String email);
    public void deleteByToken(String token);
}
