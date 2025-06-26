package com.app.webnongsan.config.interceptor;

import com.app.webnongsan.config.UrlConfig;
import com.app.webnongsan.service.UserService;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.PermissionException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

@Component
public class PermissionInterceptor implements HandlerInterceptor {
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Autowired
    private UserService userService;

    @Autowired
    private UrlConfig urlConfig;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        String pattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String requestURI = request.getRequestURI();
        String httpMethod = request.getMethod();
//        System.out.println("🔍 REQUEST URI: " + requestURI);
//        System.out.println("🔍 HTTP METHOD: " + httpMethod);
//
//        // In ra tất cả allowedUrls đang được load từ config
//        System.out.println("🔍 ALLOWED URLS:");
//        urlConfig.getAllowedUrls().forEach(entry ->
//                System.out.println(" - Path: " + entry.getPath() + " | Methods: " + entry.getMethods())
//        );
        // Kiểm tra trong allowed URLs
//        if (isAllowedUrl(requestURI, httpMethod)) {
//            return true;
//        }
        return true;

//        String role = SecurityUtil.getUserRole();
//        System.out.println("🔍 role: " + role);
//        if ("ADMIN".equals(role)) {
//            return true;
//        }

//        throw new PermissionException("Bạn không có quyền truy cập endpoint này");
    }

    private boolean isAllowedUrl(String requestURI, String httpMethod) {
        if (urlConfig.getAllowedUrls() == null) {

            return false;
        }

        return urlConfig.getAllowedUrls().stream().anyMatch(entry -> {
//            boolean pathMatch = pathMatcher.match(entry.getPath().replace("/**", "/*"), requestURI);
            boolean pathMatch = pathMatcher.match(entry.getPath(), requestURI);
            boolean methodMatch = entry.getMethods().contains(httpMethod);
            return pathMatch && methodMatch;
        });
    }
}