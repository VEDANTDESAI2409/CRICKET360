import {
  AppInfo,
  AppSetting,
  DatabaseStats,
  HealthCheckResult,
  DashboardMetrics,
  LowStockAlertItem,
  RecentTransactionItem,
  DaySalesSummary,
} from './models';

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
  dashboard: {
    getMetrics: () => Promise<IpcResult<DashboardMetrics>>;
    getLowStockAlerts: () => Promise<IpcResult<LowStockAlertItem[]>>;
    getRecentTransactions: () => Promise<IpcResult<RecentTransactionItem[]>>;
    getWeeklySalesSummary: () => Promise<IpcResult<DaySalesSummary[]>>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
