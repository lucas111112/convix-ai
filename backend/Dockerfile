FROM node:20-slim

WORKDIR /app

# Install OpenSSL (required by Prisma migration engine)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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

CMD ["sh", "-c", "echo 'PORT='$PORT && npx prisma migrate deploy && echo 'Starting tsx...' && npx tsx src/index.ts 2>&1"]
