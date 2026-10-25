#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Poroshka Unified Pre-Built Deployment                  "
echo "   Target: https://poroshka.ir                            "
echo "   Project: projectsgroup-free | Container: poroshka      "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  source "${ROOT_DIR}/.env"
  set +a
fi

export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://poroshka.ir}"
export ADMIN_PHONE="${ADMIN_PHONE:-+989015389399}"

echo "🧹 1. Cleaning up stale build caches..."
rm -rf apps/web/dist-next dist/services/core-api apps/web/.next dist/runflare-web 2>/dev/null || true

echo "🔨 2. Pre-building backend, shared libraries, and Next.js frontend locally..."
NODE_ENV=production npx nx run-many -t build --skip-nx-cache -p contracts,persian-normalizer,prompt-compiler,core-api,web

if [ ! -f "apps/web/dist-next/BUILD_ID" ]; then
  echo "❌ Error: apps/web/dist-next/BUILD_ID not found after build!"
  exit 1
fi
if [ ! -f "dist/services/core-api/main.js" ]; then
  echo "❌ Error: dist/services/core-api/main.js not found after build!"
  exit 1
fi

echo "🗄️ 3. Verifying remote database schema migrations..."
if [ -n "${DATABASE_URL}" ]; then
  node --experimental-strip-types services/core-api/src/infrastructure/database/migrate.ts || echo "⚠️ Migration notice, continuing..."
fi

echo "📦 4. Preparing pre-built artifacts for Runflare packager..."
# Runflare CLI consults git check-ignore by default. Temporarily comment out dist/ and dist-next/ in .gitignore
sed -i.bak -e 's|^dist/|# dist/|g' -e 's|^dist-next/|# dist-next/|g' -e 's|^\.next/|# .next/|g' .gitignore

restore_gitignore() {
  if [ -f .gitignore.bak ]; then
    mv .gitignore.bak .gitignore 2>/dev/null || true
  fi
}
trap restore_gitignore EXIT INT TERM

echo "🚀 5. Uploading lean pre-built container to Runflare..."
if curl -s --connect-timeout 1 http://127.0.0.1:20170 >/dev/null 2>&1; then
  export HTTP_PROXY="http://127.0.0.1:20170"
  export HTTPS_PROXY="http://127.0.0.1:20170"
  export http_proxy="http://127.0.0.1:20170"
  export https_proxy="http://127.0.0.1:20170"
fi
python3 -c "
import base64, json, urllib.request, os
token_path = os.path.expanduser('~/.config/.runflare/token')
if os.path.exists(token_path):
    try:
        with open(token_path, 'r') as f:
            raw = f.read().strip()
        decoded = json.loads(base64.b64decode(raw).decode('utf-8', errors='ignore'))
        refresh = decoded.get('refresh', '')
        if refresh:
            req = urllib.request.Request('https://api.runflare.com/account/refresh/', data=json.dumps({'refresh': refresh}).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode())
                new_token = res.get('access') or res.get('token')
                if new_token:
                    decoded['token'] = new_token
                    with open(token_path, 'w') as f_out:
                        f_out.write(base64.b64encode(json.dumps(decoded).encode()).decode())
                    print('✅ Runflare auth token refreshed.')
    except Exception as e:
        print('⚠️ Token refresh notice:', e)
"

RUNFLARE_PROJECT_ID="${RUNFLARE_PROJECT_ID:-36960}"
RUNFLARE_ITEM_ID="${RUNFLARE_ITEM_ID:-85860}"

RUNFLARE_BIN="$(command -v runflare || echo "${HOME}/.local/bin/runflare")"
python3 -c "
import pty, os, sys, subprocess, struct, termios, fcntl
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, 100, 0, 0))
cmd = ['${RUNFLARE_BIN}', 'deploy', '-y', '--force', '--project-id', '${RUNFLARE_PROJECT_ID}', '--item-id', '${RUNFLARE_ITEM_ID}', '-o', 'plain']
proc = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
os.close(slave)
try:
    while True:
        try:
            data = os.read(master, 1024)
            if not data: break
            sys.stdout.buffer.write(data)
            sys.stdout.buffer.flush()
        except OSError:
            break
finally:
    os.close(master)
sys.exit(proc.wait())
"
