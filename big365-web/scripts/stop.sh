#!/bin/bash
echo "[big365-web] Stopping dev server..."
pkill -f "vite" 2>/dev/null && echo "[big365-web] Stopped" || echo "[big365-web] No running process found"
