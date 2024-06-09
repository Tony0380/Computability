# Usa l'immagine di base di OpenJDK 19 JDK slim
FROM openjdk:19-jdk-slim

# Crea una directory /app all'interno del container
RUN mkdir /app

# Copia il file JAR nella directory /app del container
COPY ./build/libs/computability-all.jar /app

# Imposta la directory di lavoro all'interno del container
WORKDIR /app

# Definisce il comando di avvio dell'applicazione
ENTRYPOINT ["java", "-jar", "computability-all.jar"]