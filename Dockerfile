# Utilizza un'immagine base di Gradle per costruire il progetto
FROM gradle:7.3.3-jdk11 AS build

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia i file di build (build.gradle, settings.gradle) e la cartella src
COPY build.gradle settings.gradle /app/
COPY src /app/src

# Esegui il build dell'applicazione
RUN gradle build --no-daemon

# Usa un'immagine base di Java per eseguire il progetto
FROM openjdk:11-jre-slim

# Imposta la directory di lavoro nel container
WORKDIR /app

# Copia il jar costruito dall'immagine di build
COPY --from=build /app/build/libs/app.jar /app/app.jar

# Definisce il comando di avvio
CMD ["java", "-jar", "/app/app.jar"]
