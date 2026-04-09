# Build stage
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build:prod

# Production stage with nginx
FROM nginx:alpine AS final

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/matchday-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]