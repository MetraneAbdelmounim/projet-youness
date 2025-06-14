FROM node:lts
WORKDIR /usr/src/app
RUN npm install --global pm2
COPY package*.json ./
RUN apt-get update && apt-get install -y iputils-ping && apt-get install -y tzdata
# Set timezone
ENV TZ=America/Toronto
RUN npm install -f
COPY . .
EXPOSE 5000
ENV NODE_ENV="production"
CMD [ "pm2-runtime","app.js" ]
