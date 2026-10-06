
FROM node:24-alpine

WORKDIR /app

# Copia só os manifestos primeiro: aproveita o cache de camadas
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "hom"]