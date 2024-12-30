FROM node:latest
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN apt-get update && apt-get install -y iputils-ping
RUN npm install -f
COPY . .
EXPOSE 5000
CMD [ "pm2-runtime","app.js" ]
