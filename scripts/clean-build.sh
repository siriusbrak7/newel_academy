#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "package.json" ]; then
  echo "Error: package.json not found. Run this script from the project root."
  exit 1
fi

echo "Project root: $ROOT_DIR"
echo "Disk space:"
df -h .

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
if [ -f "package-lock.json" ]; then
  echo "Backing up package-lock.json -> package-lock.json.bak.${TIMESTAMP}"
  cp "package-lock.json" "package-lock.json.bak.${TIMESTAMP}"
fi

echo ""
read -r -p "This will delete node_modules, .next, dist, and build artifacts. Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Cleaning project..."
rm -rf node_modules
rm -rf .next
rm -rf dist
rm -rf build

echo "Clearing npm cache..."
npm cache clean --force

echo "Installing dependencies..."
npm install

echo "Running type check..."
npm run type-check

echo "Building..."
npm run build

echo "Clean rebuild complete"
