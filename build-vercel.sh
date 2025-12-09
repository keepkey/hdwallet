#!/bin/bash
set -e

echo "Building core package..."
yarn lerna run build --scope @keepkey/hdwallet-core

echo "Building sandbox..."
yarn lerna run build --scope @keepkey/hdwallet-sandbox --ignore @keepkey/hdwallet-keepkey-nodehid --include-dependencies

echo "Listing directory structure..."
ls -la examples/sandbox/

echo "Creating public directory and copying files..."
mkdir -p public
cp -r examples/sandbox/public/* public/

echo "Verifying public directory..."
ls -la public/

echo "Build complete!"
