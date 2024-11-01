FROM openjdk:19-jdk-slim
RUN mkdir /app
COPY ./build/libs/app.jar /app
WORKDIR /app
ENTRYPOINT ["java", "-jar", "app.jar"]