package com.app.webnongsan.domain.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleTokenRequest {
    private String idToken; // Token từ Google
}
