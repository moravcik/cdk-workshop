#!/bin/bash
set -e

LAYER_DIR="lib/layers/sharp_layer"

echo "Building sharp layer for Lambda..."

# Clean up
rm -rf "$LAYER_DIR/nodejs"
mkdir -p "$LAYER_DIR/nodejs"

cd "$LAYER_DIR/nodejs"

# Install sharp without optional dependencies
npm init -y
npm install --no-optional sharp@0.34.5

# Download and extract Linux x64 binaries
mkdir -p node_modules/@img
cd node_modules/@img

# Download sharp-linux-x64
npm pack @img/sharp-linux-x64@0.34.5
tar -xzf img-sharp-linux-x64-0.34.5.tgz
mv package sharp-linux-x64
rm img-sharp-linux-x64-0.34.5.tgz

# Download sharp-libvips-linux-x64
npm pack @img/sharp-libvips-linux-x64@1.2.4
tar -xzf img-sharp-libvips-linux-x64-1.2.4.tgz
mv package sharp-libvips-linux-x64
rm img-sharp-libvips-linux-x64-1.2.4.tgz

echo "Sharp layer built successfully at $LAYER_DIR"
