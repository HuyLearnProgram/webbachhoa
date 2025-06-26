package com.app.webnongsan.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "security")
@Data
public class UrlConfig {
    private List<UrlEntry> allowedUrls = new ArrayList<>();

    @Data
    public static class UrlEntry {
        private String path;
        private List<String> methods;
    }
}