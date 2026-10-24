import { createServer } from 'vite';
import { spawn } from 'child_process';
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function startDev() {
  console.log('Starting Cricket360 Development Environment...');

  // 1. Build initial Electron main and preload
  fs.mkdirSync('dist-electron/main', { recursive: true });
  fs.mkdirSync('dist-electron/preload', { recursive: true });

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

  // Copy migrations
  const srcMigrations = path.resolve('src/main/db/migrations');
  const destMigrations = path.resolve('dist-electron/main/migrations');
  if (fs.existsSync(srcMigrations)) {
    fs.mkdirSync(destMigrations, { recursive: true });
    for (const file of fs.readdirSync(srcMigrations)) {
      fs.copyFileSync(path.join(srcMigrations, file), path.join(destMigrations, file));
    }
  }

  // 2. Start Vite Dev Server
  const viteServer = await createServer({
    configFile: 'vite.config.ts',
  });
  await viteServer.listen();
  const address = viteServer.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5173;
  const devServerUrl = `http://localhost:${port}`;
  console.log(`Vite Dev Server running at: ${devServerUrl}`);

  // 3. Resolve electron executable
  const electronPkgPath = path.resolve('node_modules/electron/dist/electron.exe');
  const electronCmd = fs.existsSync(electronPkgPath) ? electronPkgPath : 'electron';

  console.log('Spawning Electron process...');
  const electronProcess = spawn(electronCmd, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
    shell: true,
  });

  electronProcess.on('close', async () => {
    console.log('Electron closed. Stopping Vite dev server...');
    await viteServer.close();
    process.exit(0);
  });
}

startDev().catch((err) => {
  console.error('Failed to start dev environment:', err);
  process.exit(1);
});
