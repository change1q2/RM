#!/bin/bash
set -euo pipefail

echo "=== Vercel Build Script ==="

# 1. 安装后端依赖（server 目录）
echo "Installing server dependencies..."
cd server
npm install --no-audit --no-fund --omit=dev
cd ..

# 2. 安装前端依赖并构建
echo "Installing client dependencies and building..."
rm -rf client/node_modules client/package-lock.json
npm --prefix client install --no-audit --no-fund
npm --prefix client run build

echo "=== Build Complete ==="
