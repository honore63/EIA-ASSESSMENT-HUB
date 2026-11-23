FROM node:22-bookworm-slim
WORKDIR /app/Backend
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
COPY Backend/package.json Backend/pnpm-lock.yaml Backend/pnpm-workspace.yaml ./
COPY Backend/patches ./patches
RUN CI=1 pnpm install --frozen-lockfile
COPY Backend ./
COPY Frontend /app/Frontend
COPY Database /app/Database
RUN pnpm build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
