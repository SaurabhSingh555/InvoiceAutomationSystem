#!/usr/bin/env bash
# frontend-run.sh — start the Vite dev server on port 5173
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing Node dependencies..."
  npm install
fi
echo "Starting Vite on http://localhost:5173"
npm run dev
