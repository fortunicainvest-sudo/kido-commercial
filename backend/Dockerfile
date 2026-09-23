# Build multi-stage : l'image finale ne contient que le code compilé et les
# dépendances de production, pas les devDependencies (typescript, tsx...).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx tsc -p tsconfig.json --outDir dist

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./dist/db/migrations
COPY prisma ./prisma

EXPOSE 4000
# Migre la base puis démarre le serveur — sûr à rejouer à chaque déploiement
# (chaque migration ne s'applique qu'une fois, voir src/db/migrate.ts).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
