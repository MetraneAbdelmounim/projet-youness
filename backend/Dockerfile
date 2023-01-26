FROM node:latest
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN npm install --force
COPY . .
EXPOSE 5000
RUN apt-get update -y
RUN apt-get install -y iputils-ping
RUN export NODE_ENV=production
#CMD [ "npm","run","prod","app.js" ]
CMD [ "pm2-runtime","start","app.js",'--node-args="--max-http-header-size=16000"']
