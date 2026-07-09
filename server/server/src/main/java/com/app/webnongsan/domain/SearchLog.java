package com.app.webnongsan.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "search_logs", indexes = {
        @Index(name = "idx_sl_user", columnList = "user_id"),
        @Index(name = "idx_sl_session", columnList = "sessionId"),
        @Index(name = "idx_sl_keyword_norm", columnList = "keywordNormalized")
})
@Getter
@Setter
public class SearchLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(length = 64)
    private String sessionId;

    // từ khoá gốc user gõ, giữ nguyên dấu
    @Column(length = 255)
    private String keyword;

    // bỏ dấu + lowercase, tính ở Java lúc ghi — mọi matching sau này dùng cột này,
    // không dựa vào filter DB (dấu tiếng Việt qua spring-filter/param từng bị hỏng)
    @Column(length = 255)
    private String keywordNormalized;

    private int resultCount;

    // sản phẩm được click từ kết quả tìm kiếm; null = search không dẫn tới click nào (negative signal)
    private Long clickedProductId;

    private Instant searchedAt;

    @PrePersist
    public void handleCreate() {
        this.searchedAt = Instant.now();
    }
}
