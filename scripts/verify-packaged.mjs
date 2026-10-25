import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('Testing packaged Windows executable (Cricket360.exe)...');

const packagedExe = path.resolve('dist-package/win-unpacked/Cricket360.exe');
if (!fs.existsSync(packagedExe)) {
  console.error('Packaged executable not found at:', packagedExe);
  process.exit(1);
}

const testAppData = path.resolve('test-packaged-appdata');
fs.mkdirSync(testAppData, { recursive: true });

const child = spawn(packagedExe, [`--user-data-dir=${testAppData}`], {
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
  console.log('[Packaged stdout]:', data.toString().trim());
});

child.stderr?.on('data', (data) => {
  output += data.toString();
  console.log('[Packaged stderr]:', data.toString().trim());
});

setTimeout(() => {
  console.log('Terminating packaged test instance...');
  child.kill();

  const candidatePaths = [
    path.join(testAppData, 'database', 'cricket360.sqlite'),
    path.join(testAppData, 'Cricket360', 'database', 'cricket360.sqlite'),
    path.join(testAppData, 'Cricket360', 'cricket360.sqlite'),
  ];

  const dbPath = candidatePaths.find((p) => fs.existsSync(p));

  if (dbPath && fs.existsSync(dbPath)) {
    console.log('SUCCESS: Packaged application launched, initialized database, and verified at:', dbPath);
    console.log('Database size:', fs.statSync(dbPath).size, 'bytes');
    try {
      fs.rmSync(testAppData, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {}
    process.exit(0);
  } else {
    console.error('FAILURE: Packaged app did not create database at expected paths:', candidatePaths);
    console.error('All output was:', output);
    try {
      fs.rmSync(testAppData, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}, 4500);
