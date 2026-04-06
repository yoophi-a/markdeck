import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = path.join(projectRoot, 'src', 'main');
const outputRoot = path.join(projectRoot, 'out', 'main');
const watchMode = process.argv.includes('--watch');
const touchEntryOnSync = process.argv.includes('--touch-entry');

const ignoredNames = new Set(['__tests__']);

function shouldCopyFile(fileName) {
  return !fileName.endsWith('.test.js') && !fileName.endsWith('.d.ts');
}

async function copyDirectory(sourceDir, targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
  const entries = await fsp.readdir(sourceDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      if (ignoredNames.has(entry.name)) {
        return;
      }

      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, targetPath);
        return;
      }

      if (!entry.isFile() || !shouldCopyFile(entry.name)) {
        return;
      }

      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
      await fsp.copyFile(sourcePath, targetPath);
    })
  );
}

async function syncMainRuntime({ touchEntry = false } = {}) {
  await copyDirectory(sourceRoot, outputRoot);

  if (!touchEntry) {
    return;
  }

  const entryPath = path.join(outputRoot, 'index.js');

  try {
    const now = new Date();
    await fsp.utimes(entryPath, now, now);
  } catch {
    // Ignore until electron-vite produces the main entry bundle.
  }
}

function watchDirectory(directoryPath, onChange) {
  const watcher = fs.watch(directoryPath, { recursive: true }, (_eventType, fileName) => {
    if (!fileName) {
      onChange();
      return;
    }

    const normalizedName = String(fileName);
    if (normalizedName.endsWith('.test.js') || normalizedName.endsWith('.d.ts')) {
      return;
    }

    onChange();
  });

  return watcher;
}

async function main() {
  await syncMainRuntime({ touchEntry: touchEntryOnSync });

  if (!watchMode) {
    return;
  }

  let pending = false;
  const rerun = async () => {
    if (pending) {
      return;
    }

    pending = true;
    setTimeout(async () => {
      pending = false;
      await syncMainRuntime({ touchEntry: true });
    }, 80);
  };

  const watcher = watchDirectory(sourceRoot, rerun);

  const shutdown = () => {
    watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to sync desktop main runtime', error);
  process.exit(1);
});
