FROM node:20-alpine

WORKDIR /app

# Install deps
ADD package.json package-lock.json* /app/
RUN npm ci --omit=dev

# Add source
ADD index.mjs /app/index.mjs

ENTRYPOINT ["node", "/app/index.mjs"]

