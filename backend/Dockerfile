FROM node:22-alpine
WORKDIR /app
COPY backend/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts
COPY backend/server.mjs ./server.mjs
COPY scripts/dispatch.mjs ./scripts/dispatch.mjs
COPY ephemerides.js fallback.json resonances.json ./
ENV PORT=8080 OMNI_REGISTRY_FILE=/data/devices.json
EXPOSE 8080
CMD ["node","server.mjs"]
