FROM nginx:latest

# Install openssl for certificate generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create directories for SSL
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# Generate a self-signed certificate
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -subj "/C=US/ST=State/L=City/O=Org/CN=10.8.0.21" \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt

# Copy nginx config
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
