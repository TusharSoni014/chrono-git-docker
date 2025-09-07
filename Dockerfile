FROM node:20-alpine

WORKDIR /app

ADD package.json /app/
RUN npm install --omit=dev --no-audit --no-fund

ADD index.mjs /app/index.mjs

ENTRYPOINT ["node", "/app/index.mjs"]
