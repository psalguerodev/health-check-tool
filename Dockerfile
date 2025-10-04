# Usar Node.js 18 como base
FROM node:18

# Cambiar a usuario root para privilegios administrativos
USER root

# Instalar herramientas de red y Kubernetes necesarias
RUN apt-get update && apt-get install -y \
    iputils-ping \
    telnet \
    net-tools \
    systemd \
    curl \
    unzip \
    coreutils \
    procps \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Instalar AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Instalar kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Configurar permisos administrativos
RUN echo "root ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# No crear archivos de credenciales - se usarán localStorage/memoria

# Exponer puerto 8081
EXPOSE 8081

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
