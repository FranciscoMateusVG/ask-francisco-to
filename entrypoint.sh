#!/bin/sh
set -e

if [ -z "$ADMIN_SECRET" ]; then
  echo "FATAL: ADMIN_SECRET is not set. Refusing to start."
  exit 1
fi

echo "Starting server..."
exec node server.js
