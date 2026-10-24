import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildElectron() {
  console.log('Building Electron Main and Preload bundles...');

  // 1. Ensure output directories exist
  fs.mkdirSync('dist-electron/main', { recursive: true });
  fs.mkdirSync('dist-electron/preload', { recursive: true });

  // 2. Build Main process
  await esbuild.build({
    entryPoints: ['src/main/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist-electron/main/index.cjs',
    external: ['electron', 'better-sqlite3'],
    sourcemap: true,
  });

  // 3. Build Preload process
  await esbuild.build({
    entryPoints: ['src/preload/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist-electron/preload/index.cjs',
    external: ['electron'],
    sourcemap: true,
  });

  // 4. Copy SQL migration files to dist-electron/main/migrations
  const srcMigrations = path.resolve('src/main/db/migrations');
  const destMigrations = path.resolve('dist-electron/main/migrations');
  if (fs.existsSync(srcMigrations)) {
    fs.mkdirSync(destMigrations, { recursive: true });
    const files = fs.readdirSync(srcMigrations);
    for (const file of files) {
      fs.copyFileSync(path.join(srcMigrations, file), path.join(destMigrations, file));
    }
  }

  console.log('Electron Main and Preload build complete!');
}

buildElectron().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
