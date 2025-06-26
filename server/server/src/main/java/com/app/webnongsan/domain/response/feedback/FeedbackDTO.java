package com.app.webnongsan.domain.response.feedback;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
public class FeedbackDTO {
    private long id;
    //Usser
    private Long userId;
    private String userName;
    private String userAvatarUrl;
    //Product
    private Long productId;
    private String product_name;
    private String imageUrl;
    //Feedback
    private int ratingStar;
    private String description;
    private int status;
    private Instant updatedAt;


    public FeedbackDTO() {
    }
}
