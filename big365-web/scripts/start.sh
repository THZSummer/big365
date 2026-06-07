#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if ! command -v npm &> /dev/null; then
    echo "[big365-web] ERROR: npm not found. Install Node.js 20+."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[big365-web] Installing dependencies..."
    npm install
fi

echo "[big365-web] Starting dev server on port 3000..."
npm run dev
