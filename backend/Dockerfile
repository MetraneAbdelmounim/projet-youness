FROM node:18.18-alpine3.18
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN apt-get update && apt-get install -y iputils-ping
RUN npm install -f
COPY . .
EXPOSE 5000
ENV NODE_ENV="production"
CMD [ "pm2-runtime","app.js" ]
