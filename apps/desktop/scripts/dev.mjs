import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const children = [];

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options,
  });

  children.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code);
      return;
    }
  });

  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  process.exit(code);
}

async function waitForFile(filePath, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Timed out waiting for ${filePath}`);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  const bootstrapSync = startProcess(process.execPath, ['./scripts/sync-main-runtime.mjs']);

  bootstrapSync.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });

  const electronVite = startProcess(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'electron-vite', '--watch']);
  const mainEntryPath = path.join(process.cwd(), 'out', 'main', 'index.js');

  await waitForFile(mainEntryPath);
  startProcess(process.execPath, ['./scripts/sync-main-runtime.mjs', '--touch-entry']);
  startProcess(process.execPath, ['./scripts/sync-main-runtime.mjs', '--watch']);

  electronVite.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
}

main().catch((error) => {
  console.error('Failed to start desktop development runtime', error);
  shutdown(1);
});
