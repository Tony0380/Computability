FROM openjdk:19-jdk-slim
RUN mkdir /app
COPY target/computability-all.jar /app
WORKDIR /app
ENTRYPOINT ["java", "-jar", "computability-all.jar"]