package com.app.webnongsan.domain.request;

import lombok.Getter;
import lombok.Setter;

// Body của POST products/smart-search. Từ khoá q BẮT BUỘC đi qua JSON body — mọi giá trị
// tiếng Việt có dấu gửi qua query param đều có thể bị hỏng (bug dấu đã biết toàn hệ thống),
// còn JSON body thì an toàn (các API event tracking đã chứng minh).
// userId KHÔNG nằm ở đây — luôn derive từ JWT phía server, không bao giờ tin client.
@Getter
@Setter
public class SmartSearchRequestDTO {
    private String q;
    private String sessionId;
}
