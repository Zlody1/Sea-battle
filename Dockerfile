# Production image for Sea Battle Game
# Frontend is built by GitHub Actions CI before Docker image creation
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend code
COPY backend ./backend

# Copy pre-built frontend from CI
COPY dist ./dist

# Create directory for database file
RUN mkdir -p /app/backend/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081
ENV CLIENT_URL=http://localhost:8081

# Expose ports
EXPOSE 8081

# Start the backend server
CMD ["node", "backend/server.js"]
