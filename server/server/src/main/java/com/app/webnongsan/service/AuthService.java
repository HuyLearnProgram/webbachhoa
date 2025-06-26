package com.app.webnongsan.service;

import com.app.webnongsan.domain.AuthToken;
import com.app.webnongsan.repository.AuthTokenRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class AuthService {
    private final AuthTokenRepository authTokenRepository;

    public void storeForgotToken(String token, String email) {
        AuthToken resetToken = new AuthToken();
        resetToken.setToken(token);
        resetToken.setEmail(email);
        this.authTokenRepository.save(resetToken);
    }

    public boolean checkValidToken(String token, String email){
        return this.authTokenRepository.existsByTokenAndEmail(token, email);
    }

    @Transactional
    public void deleteToken(String token){
        this.authTokenRepository.deleteByToken(token);
    }
}
