#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Poroshka Next.js Website Deployment to Runflare.com    "
echo "   Target: https://poroshka.ir                            "
echo "   Project: projectsgroup-free | Container: poroshka      "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "📦 Step 1: Building and packaging standalone bundle..."
node scripts/bundle-runflare-web.js

echo "🚀 Step 2: Deploying via Runflare CLI..."
cd "${ROOT_DIR}/dist/runflare-web"

if command -v runflare &> /dev/null; then
    runflare deploy -f
else
    ~/.local/bin/runflare deploy -f
fi

