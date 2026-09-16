# Simple Dockerfile for backend
# Build a lightweight image for running the backend in production

FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies (use package-lock / npm ci for reproducible builds)
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy application source
COPY backend/ .

# Build (if your backend has a build step)
RUN if [ -f package.json ] && grep -q "build" package.json; then npm run build || true; fi

ENV PORT=3000
EXPOSE 3000

# Default start command - rely on package.json start script
CMD ["npm", "start"]
