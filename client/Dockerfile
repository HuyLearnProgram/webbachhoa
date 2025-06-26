# ---------- Stage 1: Build ứng dụng với Node ----------
    FROM node:20 AS build

    WORKDIR /app
    
    # Copy toàn bộ project
    COPY . .
    
    # Cài dependencies
    RUN npm install
    
    # Build production (tạo thư mục dist/)
    RUN npm run build
    
    # ---------- Stage 2: Serve ứng dụng với nginx ----------
    FROM nginx:stable-alpine
    
    # Copy cấu hình nginx (tùy chọn)
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy build output từ bước build sang nginx
    COPY --from=build /app/dist /usr/share/nginx/html
    
    # Expose port để chạy web
    EXPOSE 80
    
    CMD ["nginx", "-g", "daemon off;"]
    