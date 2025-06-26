package com.app.webnongsan.util;

import com.app.webnongsan.domain.response.user.ResLoginDTO;
import com.nimbusds.jose.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UserDetails;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class SecurityUtil {
    public static final MacAlgorithm JWT_ALGORITHM = MacAlgorithm.HS512;
    private final JwtEncoder jwtEncoder;

    @Value("${jwt.base64-secret}")
    private String jwtKey;

    @Value("${jwt.accesstoken-validity-in-seconds}")
    private long accessTokenExpiration;

    @Value("${jwt.refreshtoken-validity-in-seconds}")
    private long refreshTokenExpiration;

    public SecurityUtil(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    public static Optional<String> getCurrentUserLogin() {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        return Optional.ofNullable(extractPrincipal(securityContext.getAuthentication()));
    }

    private static String extractPrincipal(Authentication authentication) {
        if (authentication == null) {
            return null;
        } else if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            return springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        } else if (authentication.getPrincipal() instanceof String s) {
            return s;
        }
        return null;
    }

    private String createToken(String email, Instant now, Instant validity, Map<String, Object> additionalClaims) {
        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
            .issuedAt(now)
            .expiresAt(validity)
            .subject(email);
        additionalClaims.forEach(claimsBuilder::claim);

        JwtClaimsSet claims = claimsBuilder.build();
        JwsHeader jwsHeader = JwsHeader.with(JWT_ALGORITHM).build();

        return this.jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }

    public String createAccessToken(String email, ResLoginDTO resLoginDTO) {
        Instant now = Instant.now();
        Instant validity = now.plus(this.accessTokenExpiration, ChronoUnit.SECONDS);

        ResLoginDTO.UserLogin userLogin = new ResLoginDTO.UserLogin();
        userLogin.setId(resLoginDTO.getUser().getId());
        userLogin.setEmail(resLoginDTO.getUser().getEmail());
        userLogin.setName(resLoginDTO.getUser().getName());
        if (resLoginDTO.getUser().getRole() != null) {
            userLogin.setRole(resLoginDTO.getUser().getRole());
        }

        assert resLoginDTO.getUser().getRole() != null;
        List<String> authorities = List.of("ROLE_" + resLoginDTO.getUser().getRole().getRoleName());
        Map<String, Object> additionalClaims = new HashMap<>();
        additionalClaims.put("user", userLogin);
        additionalClaims.put("authorities", authorities);

        return createToken(email, now, validity, additionalClaims);
    }

    public String createRefreshToken(String email, ResLoginDTO res) {
        Instant now = Instant.now();
        Instant validity = now.plus(this.refreshTokenExpiration, ChronoUnit.SECONDS);

        ResLoginDTO.UserInsideToken userToken = new ResLoginDTO.UserInsideToken();
        userToken.setId(res.getUser().getId());
        userToken.setEmail(res.getUser().getEmail());
        userToken.setName(res.getUser().getName());

        List<String> authorities = List.of("ROLE_" + res.getUser().getRole().getRoleName());

        // Tạo claims bổ sung cho refresh token
        Map<String, Object> additionalClaims = new HashMap<>();
        additionalClaims.put("user", userToken);
        additionalClaims.put("authorities", authorities);

        return createToken(email, now, validity, additionalClaims);
    }


    public String createResetPasswordToken(String email, String uuid) {
        Instant now = Instant.now();
        Instant validity = now.plus(5, ChronoUnit.MINUTES); // 5 phút

        // Tạo claims bổ sung cho reset password token
        Map<String, Object> additionalClaims = new HashMap<>();
        additionalClaims.put("email", email);
        additionalClaims.put("token", uuid);

        return createToken(email, now, validity, additionalClaims);
    }


    private SecretKey getSecretKey() {
        byte[] keyBytes = Base64.from(jwtKey).decode();
        return new SecretKeySpec(keyBytes, 0, keyBytes.length, JWT_ALGORITHM.getName());
    }

    public Jwt checkValidToken(String token){
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withSecretKey(
                getSecretKey()).macAlgorithm(SecurityUtil.JWT_ALGORITHM).build();
        try {
            return jwtDecoder.decode(token);
        } catch (Exception e) {
            System.out.println(">>> Check token error: " + e.getMessage());
            throw e;
        }
    }

    public static long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {

            Object userClaimObj = jwt.getClaims().get("user");

            if (userClaimObj instanceof Map<?, ?> userClaim) {
                Object idObj = userClaim.get("id");
                if (idObj instanceof Number) {
                    return ((Number) idObj).longValue();
                } else {
                    throw new IllegalArgumentException("User ID is not of type Number");
                }
            } else {
                throw new IllegalArgumentException("User claim is not of type Map");
            }
        }

        throw new IllegalArgumentException("User ID not found or invalid token");
    }

    // không sử dụng nếu sử dụng spring security
    public static String getUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            Object userClaimObj = jwt.getClaims().get("user");

            if (userClaimObj instanceof Map<?, ?> userClaim) {
                Object roleObj = userClaim.get("role");
                if (roleObj instanceof Map<?, ?> roleMap) {
                    Object roleNameObj = roleMap.get("roleName");
                    if (roleNameObj instanceof String) {
                        return (String) roleNameObj;
                    }
                }
            }
        }

        return null;
    }

}
