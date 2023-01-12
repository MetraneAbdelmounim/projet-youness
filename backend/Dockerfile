FROM node:latest
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN npm install --lts
COPY . .
EXPOSE 5000
CMD [ "pm2-runtime","app.js" ]
