package com.app.webnongsan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties(UrlConfig.class)
public class SecurityProperties {

    @Bean
    public UrlConfig urlConfig() {
        return new UrlConfig();
    }
}