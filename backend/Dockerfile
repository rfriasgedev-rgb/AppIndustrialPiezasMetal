FROM node:20-alpine

# Use caching for dependencies
WORKDIR /app

# Copy package info first to leverage Docker cache
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the app source code
COPY . .

# Cloud Run defaults to port 8080
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["npm", "start"]
