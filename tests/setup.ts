import '@testing-library/jest-dom';
import path from 'path';
import fs from 'fs';
import { vi } from 'vitest';

const nodeBinary = path.resolve('node_modules/better-sqlite3/build/node/build/Release/better_sqlite3.node');

if (fs.existsSync(nodeBinary)) {
  vi.mock('better-sqlite3', async (importOriginal) => {
    const actual = await importOriginal<any>();
    const ActualDatabase = actual.default || actual;

    const WrappedDatabase = function (filenameGiven: any, options: any = {}) {
      const opts = { ...options };
      if (!opts.nativeBinding) {
        opts.nativeBinding = nodeBinary;
      }
      return new (ActualDatabase as any)(filenameGiven, opts);
    } as any;

    WrappedDatabase.prototype = (ActualDatabase as any).prototype;
    Object.assign(WrappedDatabase, ActualDatabase);

    return {
      ...actual,
      default: WrappedDatabase,
    };
  });
}
