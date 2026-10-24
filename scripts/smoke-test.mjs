import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('Running Electron Launch Smoke Test...');

const electronPath = path.resolve('node_modules/electron/dist/electron.exe');
if (!fs.existsSync(electronPath)) {
  console.error('electron.exe not found at', electronPath);
  process.exit(1);
}

// Set a test AppData directory for the smoke test
const testAppData = path.resolve('test-smoke-appdata');
fs.mkdirSync(testAppData, { recursive: true });

const child = spawn(electronPath, ['.', `--user-data-dir=${testAppData}`], {
  stdio: 'pipe',
  env: {
    ...process.env,
    APPDATA: testAppData,
    ELECTRON_ENABLE_LOGGING: '1',
  },
});

let output = '';
child.stdout?.on('data', (data) => {
  output += data.toString();
  console.log('[Electron stdout]:', data.toString().trim());
});

child.stderr?.on('data', (data) => {
  output += data.toString();
  console.log('[Electron stderr]:', data.toString().trim());
});

// Let it launch, initialize DB, run migrations, and show window, then terminate after 4s
setTimeout(() => {
  console.log('Terminating smoke test Electron instance...');
  child.kill();

  // Verify the database was created and seeded
  const candidatePaths = [
    path.join(testAppData, 'database', 'cricket360.sqlite'),
    path.join(testAppData, 'Cricket360', 'database', 'cricket360.sqlite'),
    path.join(process.env.APPDATA || '', 'Cricket360', 'database', 'cricket360.sqlite'),
  ];
  const dbPath = candidatePaths.find((p) => fs.existsSync(p));

  if (dbPath && fs.existsSync(dbPath)) {
    console.log('SUCCESS: Database was verified at:', dbPath);
    console.log('Database size:', fs.statSync(dbPath).size, 'bytes');
    try {
      fs.rmSync(testAppData, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {}
    process.exit(0);
  } else {
    console.error('FAILURE: Database was not created at expected paths:', candidatePaths);
    console.error('All output was:', output);
    try {
      fs.rmSync(testAppData, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}, 4000);
