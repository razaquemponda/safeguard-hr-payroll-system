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
  enabled: process.env.NODE_ENV === 'production'
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
      console.log(`[ALERT] ${severity}: ${title} - ${message}`);
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

    logger.warn(`Alert: ${severity} - ${title}`, { message, data });
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
    console.log(`[INFO] ${alert.title}: ${alert.message}`);
  }

  private sendToEmail(alert: Alert) {
    console.log(`📧 Sending email alert: ${alert.title} to ${this.config.recipients.email.join(', ')}`);
  }

  private sendToSlack(alert: Alert) {
    console.log(`💬 Sending Slack alert: ${alert.title} to ${this.config.recipients.slack.join(', ')}`);
  }

  private sendToSMS(alert: Alert) {
    console.log(`📱 Sending SMS alert: ${alert.title} to ${this.config.recipients.sms.join(', ')}`);
  }

  private sendToPush(alert: Alert) {
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

export const startMonitoring = () => {
  window.addEventListener('error', (event) => {
    triggerError('Unhandled JavaScript Error', event.error, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    triggerError('Unhandled Promise Rejection', event.reason, {
      promise: event.promise
    });
  });

  const originalError = console.error;
  console.error = function(...args) {
    triggerError('Console Error', args[0], { args });
    originalError.apply(console, args);
  };

  window.addEventListener('online', () => {
    logger.info('Network connection restored');
  });
  
  window.addEventListener('offline', () => {
    triggerWarning('Network connection lost');
  });

  logger.info('Monitoring started');
};