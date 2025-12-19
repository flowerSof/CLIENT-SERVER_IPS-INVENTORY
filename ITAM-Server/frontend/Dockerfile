FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Exponemos el puerto de Vite
EXPOSE 5173

# Iniciamos el servidor de desarrollo
CMD ["npm", "run", "dev", "--", "--host"]