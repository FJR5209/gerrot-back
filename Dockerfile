FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependências e instalar (inclui dev deps para build)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copiar código e construir
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar artefatos do builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/pdfs ./pdfs
COPY --from=builder /app/uploads ./uploads

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- --timeout=2 http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
