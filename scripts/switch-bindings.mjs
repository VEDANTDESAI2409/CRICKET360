import fs from 'fs';
import path from 'path';

const target = process.argv[2] || 'electron'; // 'node' or 'electron'
const releaseDir = path.resolve('node_modules/better-sqlite3/build/Release');
const targetFile = path.join(releaseDir, 'better_sqlite3.node');

const nodeBinary = path.resolve('node_modules/better-sqlite3/build/node/build/Release/better_sqlite3.node');
const electronBinary = path.resolve('node_modules/better-sqlite3/build/electron/better_sqlite3.node');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

if (target === 'node') {
  if (fs.existsSync(nodeBinary)) {
    try {
      fs.copyFileSync(nodeBinary, targetFile);
      console.log('[Bindings] Active better-sqlite3: Node.js (ABI 137) for Vitest / Node test runner.');
    } catch (err) {
      if (err.code === 'EBUSY') {
        console.warn('[Bindings] Note: Release/better_sqlite3.node is locked by a running process. Vitest test runner will load Node binary directly.');
      } else {
        throw err;
      }
    }
  } else {
    console.warn('[Bindings] Node binary not found at', nodeBinary);
  }
} else if (target === 'electron') {
  if (fs.existsSync(electronBinary)) {
    try {
      fs.copyFileSync(electronBinary, targetFile);
      console.log('[Bindings] Active better-sqlite3: Electron (ABI 132) for Electron runtime / Packaging.');
    } catch (err) {
      if (err.code === 'EBUSY') {
        console.warn('[Bindings] Note: Release/better_sqlite3.node is already loaded by running Electron process.');
      } else {
        throw err;
      }
    }
  } else {
    console.warn('[Bindings] Electron binary not found at', electronBinary);
  }
}
