FROM node:18

WORKDIR /app

# copiar package.json del backend
COPY backend/package*.json ./
RUN npm install

# copiar backend
COPY backend/ .

# copiar frontend
COPY frontend/ ./frontend

EXPOSE 3000

CMD ["node", "index.js"]