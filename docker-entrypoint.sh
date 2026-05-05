#!/bin/sh
# Replace the API URL placeholder with the runtime environment variable.
# Falls back to http://localhost:8080 if API_URL is not set.

API_URL="${API_URL:-http://localhost:8080}"

echo "Configuring backend URL: $API_URL"

# Replace every occurrence of the placeholder in compiled JS bundles
find /usr/share/nginx/html -name "*.js" -exec \
  sed -i "s|__API_URL__|${API_URL}|g" {} \;

# Start Nginx in the foreground
exec nginx -g "daemon off;"
