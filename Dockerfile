# lightcloud — gerado pelo Light Cloud (menu Deploy)
# Next.js (TypeScript) com Node: "npm run build" (next build) e sobe com "npm start" (next start).
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
