#!/bin/bash

echo "========================================"
echo "   PayrollAO - Desktop Application"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    npm install --save-dev electron electron-builder
fi

echo "Starting PayrollAO..."
echo ""

# Start Vite dev server in background
npm run dev &
VITE_PID=$!

# Wait for Vite to start
echo "Waiting for server to start..."
sleep 5

# Start Electron
npx electron electron/main.cjs

# Kill Vite when Electron closes
kill $VITE_PID 2>/dev/null

echo ""
echo "PayrollAO closed."
