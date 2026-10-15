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
let isShuttingDown = false;

function startProcess(name, command, args, cwd, color, env = {}, autoRestart = false) {
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
    if (autoRestart && !isShuttingDown && code !== 0) {
      console.log(`\x1b[33m[supervisor]\x1b[0m Restarting ${name} in 1.5s ...\x1b[0m`);
      setTimeout(() => {
        if (!isShuttingDown) {
          startProcess(name, command, args, cwd, color, env, autoRestart);
        }
      }, 1500);
    }
  });

  children.push(proc);
  return proc;
}

// 1. Unified Port Allocation (Single-Project Deployment)
const PUBLIC_PORT = process.env.PORT || '3000';
const INTERNAL_API_PORT = process.env.INTERNAL_API_PORT || '4000';
const INTERNAL_API_URL = `http://127.0.0.1:${INTERNAL_API_PORT}`;

// 1. Start Core API Backend on internal port
const coreApiDistPath = path.join(ROOT_DIR, 'dist/services/core-api/main.js');
const useCoreApiDist = !isDev && fs.existsSync(coreApiDistPath);

console.log('\x1b[34m[startup]\x1b[0m Launching Core API on internal port ' + INTERNAL_API_PORT + ' ...');
startProcess(
  'core-api',
  'node',
  useCoreApiDist
    ? [coreApiDistPath]
    : ['--experimental-strip-types', 'src/bootstrap/main.ts'],
  useCoreApiDist ? ROOT_DIR : path.join(ROOT_DIR, 'services/core-api'),
  '\x1b[34m',
  { PORT: INTERNAL_API_PORT, HOST: '0.0.0.0', NODE_ENV: isDev ? 'development' : 'production' },
  true // autoRestart on crash
);

// 2. Start Web Frontend on public port with internal API proxying
const webCommand = isDev ? 'npx' : 'npx';
const webArgs = isDev ? ['next', 'dev', '-p', PUBLIC_PORT] : ['next', 'start', '-p', PUBLIC_PORT];

console.log('\x1b[32m[startup]\x1b[0m Launching Web Frontend on public port ' + PUBLIC_PORT + ' (serving both UI and /api/*) ...');
startProcess(
  'web-app',
  webCommand,
  webArgs,
  path.join(ROOT_DIR, 'apps/web'),
  '\x1b[32m',
  { PORT: PUBLIC_PORT, INTERNAL_API_URL, NEXT_PUBLIC_API_URL: '' }
);

console.log('\n\x1b[35m%s\x1b[0m', '------------------------------------------------------------------------');
console.log('\x1b[35m%s\x1b[0m', '📍 Unified Single-Project Endpoints:');
console.log('\x1b[35m%s\x1b[0m', `  🌐 Web Application : http://localhost:${PUBLIC_PORT}`);
console.log('\x1b[35m%s\x1b[0m', `  🔌 Core REST API   : http://localhost:${PUBLIC_PORT}/api/v1/catalog/prompts`);
console.log('\x1b[35m%s\x1b[0m', `  🩺 Health Probe    : http://localhost:${PUBLIC_PORT}/healthz`);
console.log('\x1b[35m%s\x1b[0m', `  📊 Admin Portal    : http://localhost:${PUBLIC_PORT}/admin`);
console.log('\x1b[35m%s\x1b[0m', `  🔒 Direct API Port : http://localhost:${INTERNAL_API_PORT}`);
console.log('\x1b[35m%s\x1b[0m', '------------------------------------------------------------------------');
console.log('\x1b[33m%s\x1b[0m', 'Press Ctrl+C to terminate all processes cleanly.\n');

// Graceful cleanup on SIGINT / SIGTERM
function cleanup() {
  isShuttingDown = true;
  console.log('\n\x1b[31m[shutdown]\x1b[0m Terminating Promptjoo services...');
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
