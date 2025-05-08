FROM node:bullseye
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN apk add --update iputils-ping
RUN npm install -f
COPY . .
EXPOSE 5000
ENV NODE_ENV="production"
CMD [ "pm2-runtime","app.js" ]
