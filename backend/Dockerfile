FROM node:20-alpine

WORKDIR /app

# Install dependencies (separate layer for caching)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Generate Prisma client (needs the schema)
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
