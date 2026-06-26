// src/utils/alerts.ts - SIMPLIFIED VERSION

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export const triggerAlert = (severity: AlertSeverity, title: string, message: string, data?: any) => {
  console.log(`[${severity}] ${title}: ${message}`, data);
};

export const triggerError = (message: string, error?: any, data?: any) => {
  console.error(`[ERROR] ${message}`, error, data);
};

export const triggerCritical = (message: string, error?: any, data?: any) => {
  console.error(`[CRITICAL] ${message}`, error, data);
};

export const triggerWarning = (message: string, data?: any) => {
  console.warn(`[WARNING] ${message}`, data);
};

export const startMonitoring = () => {
  console.log('✅ Monitoring active');
  
  window.addEventListener('error', (event) => {
    console.error('Unhandled Error:', event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection:', event.reason);
  });
};