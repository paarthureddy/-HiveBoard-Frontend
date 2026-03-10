# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Set VITE_API_URL so that Vite uses relative paths for API calls during build. 
# This works seamlessly with NGINX proxying.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build the project
RUN npm run build

# Stage 2: Serve the application with NGINX
FROM nginx:alpine

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built app to NGINX's web root
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
