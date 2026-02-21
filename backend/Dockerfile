FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build && npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
