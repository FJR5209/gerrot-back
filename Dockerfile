
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Copiar manifests e instalar todas as dependências para o build
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar o código-fonte e gerar build (TypeScript)
COPY . .
# Garantir diretórios de artefatos existem para evitar falha ao copiar no estágio runner
RUN mkdir -p pdfs uploads
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

# Instalar dependências do sistema necessárias para o Chromium/Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
		ca-certificates \
		fonts-liberation \
		libasound2 \
		libatk1.0-0 \
		libatk-bridge2.0-0 \
		libc6 \
		libcairo2 \
		libcups2 \
		libdbus-1-3 \
		libexpat1 \
		libfontconfig1 \
		libgbm1 \
		libgcc1 \
		libglib2.0-0 \
		libgdk-pixbuf2.0-0 \
		libnspr4 \
		libnss3 \
		libpango-1.0-0 \
		libx11-6 \
		libx11-xcb1 \
		libxcb1 \
		libxcomposite1 \
		libxcursor1 \
		libxdamage1 \
		libxext6 \
		libxfixes3 \
		libxi6 \
		libxrandr2 \
		libxrender1 \
		libxss1 \
		libxtst6 \
		xdg-utils \
		wget \
		gnupg \
	&& rm -rf /var/lib/apt/lists/*

# Instalar Chromium (pacote do Debian)
RUN apt-get update && apt-get install -y --no-install-recommends chromium && rm -rf /var/lib/apt/lists/*

# Copiar package.json e instalar apenas dependências de produção
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copiar artefatos do build (gerados no estágio builder)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/pdfs ./pdfs
COPY --from=builder /app/uploads ./uploads

ENV NODE_ENV=production \
		PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
		PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000

CMD ["node", "dist/main.js"]
