FROM node:22-bookworm-slim

# ffmpeg dibutuhkan untuk mempercepat lagu (speed 2x)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production \
    DATA_DIR=/data \
    TRUST_PROXY=true \
    COOKIE_SECURE=true

CMD ["node", "server.js"]
