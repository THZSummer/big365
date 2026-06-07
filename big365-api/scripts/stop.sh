#!/bin/bash
set -e

echo "[big365-api] Stopping..."

# Graceful stop via PID file or search
if [ -f ".pid" ]; then
    PID=$(cat .pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "[big365-api] Stopped (PID $PID)"
        rm -f .pid
    fi
else
    # Fallback: find and kill Java process
    PID=$(pgrep -f "big365-api" 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill "$PID" 2>/dev/null
        echo "[big365-api] Stopped (found PID $PID)"
    fi
fi
