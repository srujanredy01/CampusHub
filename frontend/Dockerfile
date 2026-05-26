FROM nginx:1.25-alpine

# Copy frontend files
COPY . /usr/share/nginx/html

# Copy nginx config for SPA-like routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
