package com.app.webnongsan.service;

import com.app.webnongsan.domain.AutoGrantType;
import com.app.webnongsan.domain.User;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.user.CreateUserDTO;
import com.app.webnongsan.domain.response.user.ReferralStatsDTO;
import com.app.webnongsan.domain.response.user.UpdateUserDTO;
import com.app.webnongsan.domain.response.user.UserDTO;
import com.app.webnongsan.repository.OrderRepository;
import com.app.webnongsan.repository.UserRepository;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    // Bỏ ký tự dễ nhầm lẫn khi đọc (0/O, 1/I) — mã này user có thể phải gõ tay chia sẻ miệng
    private static final String REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final VoucherGrantService voucherGrantService;
    private final OrderRepository orderRepository;

    public User create(User user) throws ResourceInvalidException {
        //hash password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setStatus(1);
        user.setCreatedAt(Instant.now());
        user.setReferralCode(generateUniqueReferralCode());
        User created;
        try {
            created = this.userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInvalidException("Email " + user.getEmail() + " đã tồn tại");
        }

        // Hệ trao voucher tự động (welcome) — try-catch nuốt lỗi, không phá luồng đăng ký chính,
        // đúng convention attributeOrderConversions() đã dùng cho hệ gợi ý AI.
        try {
            voucherGrantService.grantIfEligible(created, AutoGrantType.WELCOME, "");
        } catch (Exception e) {
            log.warn("Không trao được voucher WELCOME cho user={}: {}", created.getId(), e.getMessage());
        }

        // Thưởng người ĐƯỢC giới thiệu (REFERRAL_REFEREE) — chỉ trao khi referredBy đã được
        // AuthController.register() validate là mã giới thiệu THẬT SỰ tồn tại (không phải chuỗi rác
        // client gửi lên) trước khi set vào user. Khác REFERRAL_REFERRER (chỉ thưởng người giới thiệu
        // SAU KHI referee PAID đơn đầu) — cái này trao NGAY lúc tạo tài khoản.
        if (created.getReferredBy() != null && !created.getReferredBy().isBlank()) {
            try {
                voucherGrantService.grantIfEligible(created, AutoGrantType.REFERRAL_REFEREE, "");
            } catch (Exception e) {
                log.warn("Không trao được voucher REFERRAL_REFEREE cho user={}: {}", created.getId(), e.getMessage());
            }
        }

        return created;
    }

    /**
     * Thống kê giới thiệu bạn bè (Phase 6) cho user đang đăng nhập — trang "Giới thiệu bạn bè".
     */
    public ReferralStatsDTO getReferralStatsForCurrentUser() throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().orElse("");
        User user = userRepository.findByEmail(email);
        if (user == null) throw new ResourceInvalidException("User không tồn tại");

        String code = user.getReferralCode();
        long referredCount = code != null ? userRepository.countByReferredBy(code) : 0;
        long convertedCount = code != null ? orderRepository.countConvertedReferredUsers(code) : 0;
        return new ReferralStatsDTO(code, referredCount, convertedCount);
    }

    public boolean isExistedReferralCode(String code) {
        return this.userRepository.existsByReferralCode(code);
    }

    // Sinh mã giới thiệu 6 ký tự ngẫu nhiên, kiểm tra trùng trước khi gán (không atomic tuyệt đối,
    // nhưng xác suất trùng gần như bằng 0 với 34^6 tổ hợp — chấp nhận rủi ro hiếm như đã áp dụng cho
    // mã voucher tự sinh ở VoucherGrantService; nếu race hiếm xảy ra, save() ném DataIntegrityViolationException
    // và bị catch báo nhầm "email đã tồn tại" — chấp nhận được vì cực hiếm).
    private String generateUniqueReferralCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(REFERRAL_CODE_CHARS.charAt(RANDOM.nextInt(REFERRAL_CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!userRepository.existsByReferralCode(code)) return code;
        }
        return "U" + System.currentTimeMillis(); // cực hiếm khi tới đây, vẫn đảm bảo không trùng
    }

    public boolean isExistedEmail(String email) {
        return this.userRepository.existsByEmail(email);
    }

    public boolean isExistedId(long id) {
        return this.userRepository.existsById(id);
    }

    public void delete(long id) {
        this.userRepository.deleteById(id);
    }

    public CreateUserDTO convertToCreateDTO(User user) {
        CreateUserDTO res = new CreateUserDTO();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setStatus(user.getStatus());
        return res;
    }

    public UserDTO convertToUserDTO(User user) {
        UserDTO res = new UserDTO();
        res.setId(user.getId());
        res.setEmail(user.getEmail());
        res.setName(user.getName());
        res.setAddress(user.getAddress());
        res.setStatus(user.getStatus());
        res.setPhone(user.getPhone());
        res.setAvatarUrl(user.getAvatarUrl());
        res.setProvider(user.getProvider());
        res.setProviderId(user.getProviderId());
        res.setBirthday(user.getBirthday());
        return res;
    }

    public User getUserById(long id) {
        return this.userRepository.findById(id).orElse(null);
    }

    public PaginationDTO fetchAllUser(Specification<User> specification, Pageable pageable) {
        Page<User> userPage = this.userRepository.findAll(specification, pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(userPage.getTotalPages());
        meta.setTotal(userPage.getTotalElements());

        p.setMeta(meta);

        // remove sensitive data like password
        List<UserDTO> listUser = userPage.getContent()
                .stream().map(this::convertToUserDTO)
                .collect(Collectors.toList());

        p.setResult(listUser);
        return p;
    }

    public User update(User reqUser) {
        User currentUser = this.getUserById(reqUser.getId());
        if (currentUser != null) {
            String oldName = currentUser.getName();
            String oldPhone = currentUser.getPhone();
            String oldAddress = currentUser.getAddress();
            int oldStatus = currentUser.getStatus();

            //currentUser.setEmail(reqUser.getEmail());
            currentUser.setName(reqUser.getName());
            currentUser.setAddress(reqUser.getAddress());
            currentUser.setPhone(reqUser.getPhone());
            currentUser.setAvatarUrl(reqUser.getAvatarUrl());
            currentUser.setStatus(reqUser.getStatus());
            if (reqUser.getBirthday() != null) {
                currentUser.setBirthday(reqUser.getBirthday());
            }
            //currentUser.setPassword(passwordEncoder.encode(reqUser.getPassword()));
            currentUser = this.userRepository.save(currentUser);

            // Chỉ báo qua email khi ADMIN sửa hộ người khác - không báo khi user tự sửa
            // chính mình (VD qua PUT /auth/account), vì cả 2 luồng đều gọi chung method này.
            String actorEmail = SecurityUtil.getCurrentUserLogin().orElse(null);
            boolean isSelfEdit = actorEmail == null || actorEmail.equalsIgnoreCase(currentUser.getEmail());
            if (!isSelfEdit) {
                boolean infoChanged = !Objects.equals(oldName, currentUser.getName())
                        || !Objects.equals(oldPhone, currentUser.getPhone())
                        || !Objects.equals(oldAddress, currentUser.getAddress());
                boolean statusChanged = oldStatus != currentUser.getStatus();
                if (infoChanged || statusChanged) {
                    // Lý do khoá chỉ có ý nghĩa khi tài khoản vừa bị khoá (status -> 0)
                    boolean justLocked = statusChanged && currentUser.getStatus() == 0;
                    String lockReason = justLocked ? reqUser.getLockReason() : null;
                    emailService.sendEmailFromTemplateSyncUserUpdate(
                            currentUser.getEmail(), currentUser.getName(), "userUpdated",
                            oldName, currentUser.getName(),
                            oldPhone, currentUser.getPhone(),
                            oldAddress, currentUser.getAddress(),
                            statusChanged, currentUser.getStatus() == 1,
                            lockReason
                    );
                }
            }
        }
        return currentUser;
    }

    public UpdateUserDTO convertToUpdateUserDTO(User user) {
        UpdateUserDTO u = new UpdateUserDTO();
        u.setId(user.getId());
        u.setEmail(user.getEmail());
        u.setName(user.getName());
        u.setPhone(user.getPhone());
        u.setAddress(user.getAddress());
        u.setStatus(user.getStatus());
        u.setAvatarUrl(user.getAvatarUrl());
        return u;
    }

    public User getUserByUsername(String username) {
        return this.userRepository.findByEmail(username);
    }

    public void updateUserToken(String token, String email) {
        User currentUser = this.getUserByUsername(email);
        if (currentUser != null) {
            currentUser.setRefreshToken(token);
            this.userRepository.save(currentUser);
        }
    }

    public User getUserByRFTokenAndEmail(String email, String token) {
        return this.userRepository.findByEmailAndRefreshToken(email, token);
    }

    public void resetPassword(String email, String newPassword) throws ResourceInvalidException {
        User user = getUserByUsername(email);

        if (user == null) {
            throw new ResourceInvalidException("User with email " + email + " not found");
        }

        user.setPassword(passwordEncoder.encode(newPassword));

        this.userRepository.save(user);
    }

//    public User registerNewUser(OAuth2User oauth2User) {
//        User user = new User();
//        user.setEmail(oauth2User.getAttribute("email"));
//        user.setName(oauth2User.getAttribute("name"));
//        user.setAvatarUrl(oauth2User.getAttribute("picture"));
//        user.setProvider("GOOGLE");
//        return this.userRepository.save(user);
//    }

}

