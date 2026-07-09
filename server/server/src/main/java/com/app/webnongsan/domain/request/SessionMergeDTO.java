package com.app.webnongsan.domain.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SessionMergeDTO {
    @NotBlank(message = "sessionId không được để trống")
    @Size(max = 64)
    private String sessionId;
}
