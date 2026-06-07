# Vite dev server for big365-web (proxy enabled)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent
COPY . .
EXPOSE 13000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:13000 || exit 1
CMD ["npm", "run", "dev"]
