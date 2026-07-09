package com.app.webnongsan.domain.response.order;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class StatusCountDTO {
    private int status;
    private long count;
    private double revenue;
}
