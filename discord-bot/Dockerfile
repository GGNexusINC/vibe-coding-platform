FROM node:20-alpine
RUN apk add --no-cache python3 make g++ libc-dev cmake
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY bot.js ./
CMD ["node", "bot.js"]
