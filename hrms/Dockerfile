# Build stage — JDK 21 + Maven Wrapper
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

COPY pom.xml mvnw ./
COPY .mvn .mvn
COPY src ./src

RUN chmod +x mvnw \
    && ./mvnw -B clean package -DskipTests \
    && cp target/hrms-0.0.1-SNAPSHOT.jar /app/app.jar

# Runtime stage — JRE only (smaller image)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN groupadd --system spring \
    && useradd --system --gid spring spring \
    && mkdir -p /app/uploads \
    && chown -R spring:spring /app

COPY --from=build --chown=spring:spring /app/app.jar /app/app.jar

USER spring:spring

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
