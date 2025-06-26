package com.app.webnongsan.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {
    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", "du0adzgjs",
                "api_key", "482533333484894",
                "api_secret", "AYT2wK-NOWl-YOuLLSo3xHlV2O4",
                "secure", true
        ));
    }
}

