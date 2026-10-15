#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

import fs from 'node:fs';

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 STARTING PROMPTJOO ENTERPRISE PLATFORM (Core API + Web App)');
console.log('\x1b[36m%s\x1b[0m', `Mode: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log('\x1b[36m%s\x1b[0m', '========================================================================\n');

const children = [];

function startProcess(name, command, args, cwd, color, env = {}) {
  const proc = spawn(command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
    shell: true
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.log(`${color}[${name}]\x1b[0m ${line}`);
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line) console.error(`${color}[${name}]\x1b[0m ${line}`);
    }
  });

  proc.on('close', (code) => {
    console.log(`${color}[${name}]\x1b[0m Process exited with code ${code}`);
  });

  children.push(proc);
  return proc;
}

// 1. Start Core API Backend (Port 3000)
const coreApiDistPath = path.join(ROOT_DIR, 'dist/services/core-api/main.js');
const useCoreApiDist = !isDev && fs.existsSync(coreApiDistPath);

console.log('\x1b[34m[startup]\x1b[0m Launching Core API on http://localhost:3000 ...');
startProcess(
  'core-api',
  'node',
  useCoreApiDist
    ? [coreApiDistPath]
    : ['--experimental-strip-types', 'src/bootstrap/main.ts'],
  useCoreApiDist ? ROOT_DIR : path.join(ROOT_DIR, 'services/core-api'),
  '\x1b[34m',
  { PORT: '3000', HOST: '0.0.0.0', NODE_ENV: isDev ? 'development' : 'production' }
);

// 2. Start Web Frontend (Port 3001)
const webCommand = isDev ? 'npx' : 'npx';
const webArgs = isDev ? ['next', 'dev', '-p', '3001'] : ['next', 'start', '-p', '3001'];

console.log('\x1b[32m[startup]\x1b[0m Launching Web App on http://localhost:3001 ...');
startProcess(
  'web-app',
  webCommand,
  webArgs,
  path.join(ROOT_DIR, 'apps/web'),
  '\x1b[32m',
  { PORT: '3001', NEXT_PUBLIC_API_URL: 'http://localhost:3000' }
);

console.log('\n\x1b[35m%s\x1b[0m', '------------------------------------------------------------------------');
console.log('\x1b[35m%s\x1b[0m', '📍 Available Endpoints:');
console.log('\x1b[35m%s\x1b[0m', '  🌐 Web Frontend : http://localhost:3001');
console.log('\x1b[35m%s\x1b[0m', '  🔌 Core API     : http://localhost:3000');
console.log('\x1b[35m%s\x1b[0m', '  🩺 Health Probe : http://localhost:3000/healthz');
console.log('\x1b[35m%s\x1b[0m', '  📊 Admin Portal : http://localhost:3001/admin');
console.log('\x1b[35m%s\x1b[0m', '------------------------------------------------------------------------');
console.log('\x1b[33m%s\x1b[0m', 'Press Ctrl+C to terminate all processes cleanly.\n');

// Graceful cleanup on SIGINT / SIGTERM
function cleanup() {
  console.log('\n\x1b[31m[shutdown]\x1b[0m Terminating Promptjoo services...');
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
