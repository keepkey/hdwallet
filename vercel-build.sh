#!/bin/bash
set -e

echo "Building @keepkey/hdwallet-core..."
yarn lerna run build --scope @keepkey/hdwallet-core

echo "Building @keepkey/hdwallet-sandbox..."
yarn lerna run build --scope @keepkey/hdwallet-sandbox --include-dependencies

echo "Looking for build output..."
find . -name "public" -type d | head -5

echo "Moving build output to root..."
if [ -d "examples/sandbox/public" ]; then
  mv examples/sandbox/public ./public
  echo "✓ Moved examples/sandbox/public to ./public"
else
  echo "✗ examples/sandbox/public not found!"
  echo "Current directory:"
  pwd
  echo "Directory contents:"
  ls -la examples/sandbox/ || echo "examples/sandbox/ doesn't exist"
  exit 1
fi

echo "Build complete!"
ls -la public/ | head -10
