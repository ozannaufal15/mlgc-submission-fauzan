FROM node:22

WORKDIR /home/node/app

ENV PORT 8080

COPY package.json ./

COPY package-lock.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ['npm', 'start']