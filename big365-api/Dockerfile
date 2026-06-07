# Multi-stage build for big365-api
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B -q
COPY src ./src
RUN mvn package -DskipTests -B -q

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache wget
WORKDIR /app
COPY --from=builder /app/target/big365-api.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=25s \
  CMD wget -q --spider http://localhost:8080/api/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
