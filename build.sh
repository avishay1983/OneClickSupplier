#!/usr/bin/env bash
# Build script for Render.com deployment
# This script builds both the React frontend and installs Python dependencies

set -e  # Exit on any error

echo "=== OneClickSupplier Build Script ==="

# Step 1: Install Node.js dependencies and build React frontend
echo "--- Installing Node.js dependencies ---"
npm install

echo "--- Building React frontend ---"
npm run build

echo "--- Frontend built to dist/ ---"
ls -la dist/

# Step 2: Install Python dependencies
echo "--- Installing Python dependencies ---"
cd backend
pip install -r requirements.txt

echo "=== Build complete ==="
