FROM node:latest
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN npm install --force
COPY . .
EXPOSE 5000
RUN apt-get update -y
RUN apt-get install -y iputils-ping
CMD [ "npm","run","dev","app.js" ]