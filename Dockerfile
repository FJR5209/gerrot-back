
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Copiar manifests e instalar todas as dependências para o build
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar o código-fonte e gerar build (TypeScript)
COPY . .
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

# Apenas dependências de produção no runtime
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copiar artefatos do build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/pdfs ./pdfs
COPY --from=builder /app/uploads ./uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
