import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '../../web');
const standaloneDir = path.join(webDir, '.next', 'standalone');
const rootNodeModulesDir = path.join(standaloneDir, 'node_modules');
const appNodeModulesDir = path.join(standaloneDir, 'apps', 'web', 'node_modules');

if (!fs.existsSync(standaloneDir)) {
  throw new Error(`Standalone build not found: ${standaloneDir}`);
}

if (!fs.existsSync(rootNodeModulesDir)) {
  throw new Error(`Standalone node_modules not found: ${rootNodeModulesDir}`);
}

fs.rmSync(appNodeModulesDir, { recursive: true, force: true });
fs.cpSync(rootNodeModulesDir, appNodeModulesDir, { recursive: true, dereference: false });
