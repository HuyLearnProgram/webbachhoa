# ----------- Stage 1: Build với Maven -----------
FROM maven:3.9.8-amazoncorretto-21 AS build

# Tạo thư mục làm việc
WORKDIR /app

# Copy pom.xml trước để tận dụng cache Docker layer
COPY pom.xml .

# Resolve dependencies trước (có thể bỏ qua nếu build lần đầu)
# RUN mvn dependency:go-offline

# Copy toàn bộ source code
COPY src ./src

# Build jar file (skip test cho nhanh)
RUN mvn clean package -DskipTests


# ----------- Stage 2: Runtime với JDK -----------
FROM amazoncorretto:21.0.4

# Đặt working directory
WORKDIR /app

# Copy file JAR từ stage build sang
COPY --from=build /app/target/*.jar app.jar

# Tùy chọn: Set timezone nếu dùng Việt Nam
ENV TZ=Asia/Ho_Chi_Minh

# Tùy chọn: expose port
EXPOSE 8080

# Chạy ứng dụng
ENTRYPOINT ["java", "-jar", "app.jar"]

# CREATE NETWORK
# docker network create webnongsan-network
# docker run --network webnongsan-network --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -d mysql:8.0.36-debian
# docker run --name webnongsan-backend --network webnongsan-network -p 8080:8080 -e DBMS_CONNECTION=jdbc:mysql://mysql:3306/webnongsan webnongsan-backend:0.0.1

#RUN DOCKER CONTAINTER
# docker run -d -p 8080:8080 --name webnongsan-backend -e DBMS_CONNECTION=jdbc:mysql://172.0.0.2:3306/webnongsan webnongsan-backend:0.0.1

#Push Image Docker Hub
#docker build -t huyprogram/webnongsan-backend:0.0.1 .
# docker image push huyprogram/webnongsan-backend:0.0.1

#Pull and run image
# docker pull huyprogram/webnongsan-backend:0.0.1
# docker run --name webnongsan-backend --network webnongsan-network -p 8080:8080 -e DBMS_CONNECTION=jdbc:mysql://mysql:3306/webnongsan huyprogram/webnongsan-backend:0.0.1

