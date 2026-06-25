// src/utils/alerts.ts

import { logger } from './logging';

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  PUSH = 'push',
  CONSOLE = 'console'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface AlertConfig {
  channels: AlertChannel[];
  recipients: {
    email: string[];
    slack: string[];
    sms: string[];
    push: string[];
  };
  thresholds: {
    [key: string]: {
      count: number;
      window: number;
    };
  };
  enabled: boolean;
  developmentLogging: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  channels: [AlertChannel.EMAIL, AlertChannel.SLACK],
  recipients: {
    email: ['admin@safeguard.mw', 'it-team@safeguard.mw'],
    slack: ['#alerts'],
    sms: ['+265881234567'],
    push: ['admin']
  },
  thresholds: {
    error: { count: 10, window: 5 * 60 * 1000 },
    critical: { count: 1, window: 0 },
    warning: { count: 20, window: 5 * 60 * 1000 }
  },
  enabled: process.env.NODE_ENV === 'production',
  developmentLogging: true
};

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  source?: string;
}

class AlertManager {
  private config: AlertConfig;
  private errorCount: number = 0;
  private warningCount: number = 0;
  private lastReset: number = Date.now();
  private alertHistory: Alert[] = [];
  private maxHistorySize: number = 1000;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startResetTimer();
  }

  private startResetTimer() {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastReset > this.config.thresholds.error.window) {
        this.errorCount = 0;
        this.warningCount = 0;
        this.lastReset = now;
      }
    }, 60000);
  }

  sendAlert(
    severity: AlertSeverity,
    title: string,
    message: string,
    data?: any
  ): void {
    if (!this.config.enabled) {
      if (this.config.developmentLogging) {
        console.log(`[ALERT] ${severity}: ${title} - ${message}`, data);
      }
      return;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      title,
      message,
      timestamp: new Date(),
      data,
      source: window.location.hostname
    };

    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    if (this.config.enabled) {
      logger.warn(`Alert: ${severity} - ${title}`, { message, data });
    }
    
    this.checkThresholds(severity, alert);

    switch (severity) {
      case AlertSeverity.CRITICAL:
        this.sendCriticalAlert(alert);
        break;
      case AlertSeverity.ERROR:
        this.sendErrorAlert(alert);
        break;
      case AlertSeverity.WARNING:
        this.sendWarningAlert(alert);
        break;
      default:
        this.sendInfoAlert(alert);
        break;
    }
  }

  private checkThresholds(severity: AlertSeverity, alert: Alert) {
    const now = Date.now();
    
    switch (severity) {
      case AlertSeverity.ERROR:
        this.errorCount++;
        if (this.errorCount >= this.config.thresholds.error.count) {
          this.sendAlert(
            AlertSeverity.CRITICAL,
            'High Error Rate Detected',
            `${this.errorCount} errors occurred in the last ${this.config.thresholds.error.window / 1000} seconds`,
            { count: this.errorCount, window: this.config.thresholds.error.window }
          );
          this.errorCount = 0;
        }
        break;
        
      case AlertSeverity.WARNING:
        this.warningCount++;
        if (this.warningCount >= this.config.thresholds.warning.count) {
          this.sendAlert(
            AlertSeverity.ERROR,
            'High Warning Rate Detected',
            `${this.warningCount} warnings occurred in the last ${this.config.thresholds.warning.window / 1000} seconds`,
            { count: this.warningCount, window: this.config.thresholds.warning.window }
          );
          this.warningCount = 0;
        }
        break;
    }
  }

  private sendCriticalAlert(alert: Alert) {
    this.sendToEmail(alert);
    this.sendToSlack(alert);
    this.sendToSMS(alert);
    this.sendToPush(alert);
  }

  private sendErrorAlert(alert: Alert) {
    this.sendToEmail(alert);
    this.sendToSlack(alert);
  }

  private sendWarningAlert(alert: Alert) {
    this.sendToSlack(alert);
  }

  private sendInfoAlert(alert: Alert) {
    if (this.config.developmentLogging) {
      console.log(`[INFO] ${alert.title}: ${alert.message}`);
    }
  }

  private sendToEmail(alert: Alert) {
    if (!this.config.enabled) {
      if (this.config.developmentLogging) {
        console.log(`📧 [DEV] Email alert: ${alert.title}`);
      }
      return;
    }
    console.log(`📧 Sending email alert: ${alert.title} to ${this.config.recipients.email.join(', ')}`);
  }

  private sendToSlack(alert: Alert) {
    if (!this.config.enabled) {
      if (this.config.developmentLogging) {
        console.log(`💬 [DEV] Slack alert: ${alert.title}`);
      }
      return;
    }
    console.log(`💬 Sending Slack alert: ${alert.title} to ${this.config.recipients.slack.join(', ')}`);
  }

  private sendToSMS(alert: Alert) {
    if (!this.config.enabled) {
      if (this.config.developmentLogging) {
        console.log(`📱 [DEV] SMS alert: ${alert.title}`);
      }
      return;
    }
    console.log(`📱 Sending SMS alert: ${alert.title} to ${this.config.recipients.sms.join(', ')}`);
  }

  private sendToPush(alert: Alert) {
    if (!this.config.enabled) {
      if (this.config.developmentLogging) {
        console.log(`🔔 [DEV] Push alert: ${alert.title}`);
      }
      return;
    }
    console.log(`🔔 Sending push notification: ${alert.title}`);
  }

  getAlertHistory(severity?: AlertSeverity): Alert[] {
    if (severity) {
      return this.alertHistory.filter(a => a.severity === severity);
    }
    return this.alertHistory;
  }

  clearHistory(): void {
    this.alertHistory = [];
  }
}

export const alertManager = new AlertManager();

export const triggerAlert = (
  severity: AlertSeverity,
  title: string,
  message: string,
  data?: any
) => {
  alertManager.sendAlert(severity, title, message, data);
};

export const triggerError = (message: string, error?: any, data?: any) => {
  triggerAlert(AlertSeverity.ERROR, 'Error Occurred', message, { error, data });
};

export const triggerCritical = (message: string, error?: any, data?: any) => {
  triggerAlert(AlertSeverity.CRITICAL, 'Critical Error', message, { error, data });
};

export const triggerWarning = (message: string, data?: any) => {
  triggerAlert(AlertSeverity.WARNING, 'Warning', message, data);
};

// ===== UPDATED: startMonitoring with safe error handling =====
export const startMonitoring = () => {
  // Skip monitoring in development to reduce console noise
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Monitoring is active in development mode (errors will be logged to console)');
  }

  // Store the original console.error BEFORE overriding
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  // Only override console.error in production
  if (process.env.NODE_ENV === 'production') {
    console.error = function(...args) {
      // Call the original FIRST to prevent recursion
      originalConsoleError.apply(console, args);
      
      // Then try to trigger the alert (but don't use console.error inside)
      try {
        // Safely convert args to string
        const safeArgs = args.map(arg => {
          try {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg);
              } catch {
                return String(Object.prototype.toString.call(arg));
              }
            }
            return String(arg);
          } catch {
            return '[Unable to convert]';
          }
        });
        
        // Only trigger for real errors, not our own logging attempts
        const firstArg = safeArgs[0] || '';
        if (typeof firstArg === 'string' && (firstArg.includes('Error') || firstArg.includes('Failed'))) {
          triggerAlert(AlertSeverity.ERROR, 'Console Error', firstArg, { args: safeArgs });
        }
      } catch (alertError) {
        // If alert fails, just log to original console
        originalConsoleError.call(console, 'Alert failed:', alertError);
      }
    };
  }

  // ===== UPDATED: Error event listener with safe object handling =====
  window.addEventListener('error', (event) => {
    // Safely extract error details WITHOUT calling String() on the error object
    let errorMessage = 'Unknown error';
    let errorStack = '';
    let errorName = '';
    
    try {
      if (event.error) {
        // Safely get message without using String() on the whole object
        if (typeof event.error === 'object') {
          errorMessage = event.error.message || Object.prototype.toString.call(event.error);
          errorStack = event.error.stack || '';
          errorName = event.error.name || '';
        } else {
          errorMessage = String(event.error);
        }
      } else if (event.message) {
        errorMessage = event.message;
      }
    } catch (e) {
      errorMessage = 'Unable to parse error';
    }
    
    // ===== FIX: Log safely without passing the error object directly =====
    // Use a safe string version of the error
    const safeErrorString = errorMessage + (errorStack ? '\n' + errorStack : '');
    originalConsoleError.call(console, 'Unhandled Error:', safeErrorString);
    
    if (process.env.NODE_ENV === 'production') {
      try {
        triggerError('Unhandled JavaScript Error', safeErrorString, {
          message: errorMessage,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: errorStack,
          name: errorName
        });
      } catch (e) {
        originalConsoleError.call(console, 'Failed to trigger error alert:', e);
      }
    }
  });

  // ===== UPDATED: Unhandled rejection listener =====
  window.addEventListener('unhandledrejection', (event) => {
    let reasonMessage = 'Unknown reason';
    let reasonStack = '';
    
    try {
      if (event.reason) {
        if (typeof event.reason === 'object') {
          reasonMessage = event.reason.message || Object.prototype.toString.call(event.reason);
          reasonStack = event.reason.stack || '';
        } else {
          reasonMessage = String(event.reason);
        }
      }
    } catch (e) {
      reasonMessage = 'Unable to parse rejection reason';
    }
    
    // ===== FIX: Log safely =====
    const safeReasonString = reasonMessage + (reasonStack ? '\n' + reasonStack : '');
    originalConsoleError.call(console, 'Unhandled Rejection:', safeReasonString);
    
    if (process.env.NODE_ENV === 'production') {
      try {
        triggerError('Unhandled Promise Rejection', safeReasonString, {
          message: reasonMessage,
          stack: reasonStack,
          promise: event.promise
        });
      } catch (e) {
        originalConsoleError.call(console, 'Failed to trigger rejection alert:', e);
      }
    }
  });

  // Online/Offline listeners
  window.addEventListener('online', () => {
    if (process.env.NODE_ENV === 'production') {
      try {
        logger.info('Network connection restored');
      } catch (e) {
        originalConsoleLog.call(console, 'Network restored');
      }
    } else {
      console.log('📶 Network connection restored');
    }
  });
  
  window.addEventListener('offline', () => {
    if (process.env.NODE_ENV === 'production') {
      try {
        triggerWarning('Network connection lost');
      } catch (e) {
        originalConsoleWarn.call(console, 'Network lost');
      }
    } else {
      console.warn('📶 Network connection lost');
    }
  });

  if (process.env.NODE_ENV === 'production') {
    try {
      logger.info('Monitoring started');
    } catch (e) {
      console.log('Monitoring started (logging disabled)');
    }
  } else {
    console.log('✅ Monitoring started in development mode');
  }
};