FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run tests
RUN npm test

# Expose API port
EXPOSE 3000

# Run the service
CMD ["npm", "start"]
