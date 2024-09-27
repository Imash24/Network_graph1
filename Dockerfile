FROM node:14


WORKDIR /usr/src/app


COPY package*.json ./


RUN npm install


RUN apt-get update && apt-get install -y sqlite3


COPY . .


EXPOSE 3000


CMD ["node", "server.js"]
