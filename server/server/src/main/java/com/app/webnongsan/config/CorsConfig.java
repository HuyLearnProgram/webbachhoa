package com.app.webnongsan.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    // Danh sách origin cho phép — mặc định giữ nguyên 3 origin dev cũ (Vite dev server/preview) nếu
    // không override; đổi qua .env (app.cors.allowed-origins, phân tách bằng dấu phẩy) khi deploy domain
    // production, không cần sửa code/rebuild.
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:4173,http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE",
                "OPTIONS")); // Allowed methods
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type",
                "Accept", "x-no-retry"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        // How long the response from a pre-flight request can be cached by clients
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Apply this configuration to all paths
        return source;
    }
}
