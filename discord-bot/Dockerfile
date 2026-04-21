FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production --legacy-peer-deps
COPY bot.js ./
CMD ["node", "bot-minimal.js"]
