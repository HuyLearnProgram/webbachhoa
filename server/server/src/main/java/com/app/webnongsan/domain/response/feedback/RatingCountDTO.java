package com.app.webnongsan.domain.response.feedback;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class RatingCountDTO {
    private int ratingStar;
    private long count;
}
