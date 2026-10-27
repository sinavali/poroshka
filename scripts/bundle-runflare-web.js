#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'apps/web');
const outputDir = path.join(rootDir, 'dist/runflare-web');

console.log('🚀 [Promptjoo] Preparing standalone Next.js bundle for Runflare...');

// 1. Build apps/web
console.log('📦 Step 1: Building @promptjoo/web with standalone output...');
execSync('pnpm --filter @promptjoo/web build', { cwd: rootDir, stdio: 'inherit' });

// 2. Clear old output directory
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// 3. Copy standalone directory
const standaloneSrc = fs.existsSync(path.join(webDir, 'dist-next/standalone'))
  ? path.join(webDir, 'dist-next/standalone')
  : path.join(webDir, '.next/standalone');
if (!fs.existsSync(standaloneSrc)) {
  console.error('❌ Standalone build not found at:', standaloneSrc);
  process.exit(1);
}

console.log('📂 Step 2: Copying standalone server & dependencies...');
fs.cpSync(standaloneSrc, outputDir, { recursive: true });

// 4. Copy static assets and public directory to both apps/web and root inside standalone bundle
const staticSrc = fs.existsSync(path.join(webDir, 'dist-next/static'))
  ? path.join(webDir, 'dist-next/static')
  : path.join(webDir, '.next/static');
const staticDestWebNext = path.join(outputDir, 'apps/web/.next/static');
const staticDestWebDist = path.join(outputDir, 'apps/web/dist-next/static');
const staticDestRoot = path.join(outputDir, '.next/static');
if (fs.existsSync(staticSrc)) {
  console.log('🎨 Step 3: Copying static chunk assets (dist-next/static)...');
  fs.cpSync(staticSrc, staticDestWebNext, { recursive: true });
  fs.cpSync(staticSrc, staticDestWebDist, { recursive: true });
  fs.cpSync(staticSrc, staticDestRoot, { recursive: true });
}

// Ensure build directory exists at root as well (for CWD resolution)
const dotNextSrc = fs.existsSync(path.join(webDir, 'dist-next'))
  ? path.join(webDir, 'dist-next')
  : path.join(webDir, '.next');
const dotNextRoot = path.join(outputDir, '.next');
if (fs.existsSync(dotNextSrc)) {
  fs.cpSync(dotNextSrc, dotNextRoot, { recursive: true });
}

const publicSrc = path.join(webDir, 'public');
const publicDestWeb = path.join(outputDir, 'apps/web/public');
const publicDestRoot = path.join(outputDir, 'public');
if (fs.existsSync(publicSrc)) {
  console.log('🖼️ Step 4: Copying public directory...');
  fs.cpSync(publicSrc, publicDestWeb, { recursive: true });
  fs.cpSync(publicSrc, publicDestRoot, { recursive: true });
}

// 5. Create entrypoint package.json and start script in root of outputDir for Runflare
const runflarePackageJson = {
  name: "promptjoo-web-runflare",
  version: "1.0.0",
  private: true,
  scripts: {
    build: "echo 'Pre-built standalone ready'",
    start: "node apps/web/server.js"
  },
  dependencies: {
    next: "16.5.0-canary.19",
    react: "^19.3.1",
    "react-dom": "^19.3.1"
  },
  engines: {
    node: ">=20.0.0"
  }
};

fs.writeFileSync(
  path.join(outputDir, 'package.json'),
  JSON.stringify(runflarePackageJson, null, 2),
  'utf-8'
);

// 6. Explicitly keep .next from being ignored by parent .gitignore during CLI upload
fs.writeFileSync(
  path.join(outputDir, '.gitignore'),
  '!.next/\n!.next/**\n!node_modules/\n!node_modules/**\n',
  'utf-8'
);

// 7. Clean host-specific symlinks and install flat production dependencies
console.log('📦 Step 5: Preparing self-contained production modules (no broken symlinks)...');
const webModules = path.join(outputDir, 'apps/web/node_modules');
if (fs.existsSync(webModules)) {
  fs.rmSync(webModules, { recursive: true, force: true });
}
execSync('npm install --omit=dev --no-audit --no-fund', { cwd: outputDir, stdio: 'inherit' });

// 8. Create Procfile for PaaS runners
fs.writeFileSync(
  path.join(outputDir, 'Procfile'),
  'web: node apps/web/server.js\n',
  'utf-8'
);

// 9. Create instant Dockerfile for Runflare container deployment
const runflareDockerfile = `FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
`;
fs.writeFileSync(path.join(outputDir, 'Dockerfile'), runflareDockerfile, 'utf-8');
fs.writeFileSync(path.join(outputDir, '.dockerignore'), '.git\n*.local\n', 'utf-8');

console.log('✅ Standalone Runflare bundle successfully created at:');
console.log(`   ${outputDir}`);
console.log('\n💡 To run locally:');
console.log(`   cd ${outputDir} && PORT=3000 node apps/web/server.js\n`);
