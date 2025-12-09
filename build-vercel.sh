#!/bin/bash
set -e

echo "Building core package..."
yarn lerna run build --scope @keepkey/hdwallet-core

echo "Building sandbox..."
yarn lerna run build --scope @keepkey/hdwallet-sandbox --ignore @keepkey/hdwallet-keepkey-nodehid --include-dependencies

echo "Build complete! Files are in ./public/"
ls -la public/ | head -10
