FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production --legacy-peer-deps
COPY bot.js ./
COPY bot-message-commands.js ./
CMD ["node", "bot-message-commands.js"]
