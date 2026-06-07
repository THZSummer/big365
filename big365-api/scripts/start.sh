#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if command -v mvn &> /dev/null; then
    echo "[big365-api] Starting with Maven..."
    mvn spring-boot:run
elif [ -f "target/big365-api.jar" ]; then
    echo "[big365-api] Starting with java -jar..."
    java -jar target/big365-api.jar
else
    echo "[big365-api] ERROR: No Maven or JAR found. Build first: mvn package -DskipTests"
    exit 1
fi
