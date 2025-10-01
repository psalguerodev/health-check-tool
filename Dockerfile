# Usar Node.js 18 como base
FROM node:18

# Instalar herramientas de red necesarias
RUN apt-get update && apt-get install -y iputils-ping telnet && rm -rf /var/lib/apt/lists/*

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

# Exponer puerto 8081
EXPOSE 8081

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
