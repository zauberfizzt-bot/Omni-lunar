FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY server.mjs ./
ENV PORT=8080 OMNI_REGISTRY_FILE=/data/devices.json
EXPOSE 8080
CMD ["node","server.mjs"]
