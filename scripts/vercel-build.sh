#!/bin/bash
set -euo pipefail

# 根目录：server 依赖（线上用 Turso；better-sqlite3 是 optional）
npm install --no-audit --no-fund --omit=dev --include=optional

cd server
npm install --no-audit --no-fund --omit=optional --omit=dev
cd ..

# 前端：删除缓存后完整安装（必须带 --include=optional，否则 Linux 下 rollup 原生二进制缺失）
rm -rf client/node_modules client/package-lock.json
npm --prefix client install --no-audit --no-fund --include=optional
npm --prefix client run build
