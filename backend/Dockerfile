# Express backend image (self-host runtime; the production API is the Cloudflare Worker).
# Build from the repository root: docker build -f backend/Dockerfile -t juwon-backend .
# Environment variables: docs/DEPLOYMENT.md.

# Node 22 matches package.json engines and CI.
FROM node:22-alpine

WORKDIR /app

# Reproducible, production-only install.
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "app.js"]
