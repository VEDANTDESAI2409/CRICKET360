import { AppInfo, AppSetting, DatabaseStats, HealthCheckResult } from './models';

export type IpcResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface IpcApi {
  app: {
    getInfo: () => Promise<IpcResult<AppInfo>>;
    getHealthCheck: () => Promise<IpcResult<HealthCheckResult>>;
  };
  settings: {
    getAll: () => Promise<IpcResult<AppSetting[]>>;
    get: (key: string) => Promise<IpcResult<string | null>>;
    set: (key: string, value: string) => Promise<IpcResult<boolean>>;
  };
  db: {
    getStats: () => Promise<IpcResult<DatabaseStats>>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
