package com.app.webnongsan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // Riêng cho proxy sang Python recommendation-service: timeout ngắn bắt buộc
    // (fail-fast rồi fallback rule-based, không để Home/PDP treo khi Python chết).
    // Không dùng chung bean restTemplate ở trên vì bean đó không có timeout.
    @Bean(name = "recommendationRestTemplate")
    public RestTemplate recommendationRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2500);
        return new RestTemplate(factory);
    }
}
