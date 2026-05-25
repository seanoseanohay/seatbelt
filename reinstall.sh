#!/bin/bash
set -e

echo "🔧 Seatbelt fast reinstall (build + global install)..."
cd "$(dirname "$0")"
npm run build
npm install -g .
echo "✅ Done. You can now run: seatbelt"
