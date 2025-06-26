//package com.app.webnongsan.service;
//
//import com.app.webnongsan.CustomUserDetails;
//import com.app.webnongsan.domain.Role;
//import com.app.webnongsan.domain.User;
//import com.app.webnongsan.repository.UserRepository;
//import jakarta.security.auth.message.AuthException;
//import lombok.RequiredArgsConstructor;
//import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
//import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
//import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
//import org.springframework.security.oauth2.core.user.OAuth2User;
//import org.springframework.stereotype.Service;
//import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
//import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
//
//import java.io.IOException;
//import java.security.GeneralSecurityException;
//
//@Service
//@RequiredArgsConstructor
//public class CustomOAuth2UserService extends DefaultOAuth2UserService {
//
//    private final UserRepository userRepository;
//    private final GoogleIdTokenVerifier googleIdTokenVerifier;
//
//    @Override
//    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
//        OAuth2User oauth2User = super.loadUser(userRequest);
//        try {
//            // Truyền idToken cho phương thức processOAuth2User
//            String idToken = (String) oauth2User.getAttributes().get("id_token");
//            return processOAuth2User(idToken);
//        } catch (IOException | GeneralSecurityException e) {
//            throw new RuntimeException(e);
//        }
//    }
//
//    public OAuth2User processOAuth2User(String idToken) throws AuthException, GeneralSecurityException, IOException {
//        // Xác thực token với Google
//        GoogleIdToken googleIdToken = googleIdTokenVerifier.verify(idToken);
//        if (googleIdToken != null) {
//            // Lấy email từ payload
//            String email = googleIdToken.getPayload().getEmail();
//
//            User user = userRepository.findByEmail(email);
//            if (user == null) {
//                user = registerNewUser(googleIdToken);
//            }
//
//            return new CustomUserDetails(user, googleIdToken.getPayload());
//        }
//
//        throw new AuthException("Invalid ID Token");
//    }
//
//    // Phương thức để tạo mới người dùng
//    public User registerNewUser(GoogleIdToken payload) {
//        User user = new User();
//        user.setEmail(payload.getPayload().getEmail()); // Lấy email từ payload
//        user.setName((String) payload.getPayload().get("name")); // Lấy tên từ payload
//        user.setAvatarUrl((String) payload.getPayload().get("picture")); // Lấy avatar từ payload
//        user.setProvider("GOOGLE");
//        user.setStatus(1);
//        Role r = new Role();
//        r.setId(2);
//        user.setRole(r);
//        user.setProviderId(payload.getPayload().getSubject()); // Lấy providerId từ payload
//        return userRepository.save(user);
//    }
//}
