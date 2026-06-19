// src/utils/logging.ts

import { supabase } from '../lib/supabase';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

const LOG_CONFIG = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true,
  includeUserContext: true,
  enableConsole: true,
  enableDatabase: process.env.NODE_ENV === 'production',
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  user?: any;
  data?: any;
  environment?: string;
  trace?: string;
}

const getUserContext = () => {
  try {
    const userStr = localStorage.getItem('sb-user') || 'null';
    const user = JSON.parse(userStr);
    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
};

const formatLogEntry = (level: LogLevel, message: string, data?: any): LogEntry => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV,
  };
  
  if (LOG_CONFIG.includeUserContext) {
    entry.user = getUserContext();
  }
  
  if (data) {
    entry.data = data;
  }
  
  if (data?.error instanceof Error) {
    entry.trace = data.error.stack;
  }
  
  return entry;
};

const sendToDatabase = async (entry: LogEntry) => {
  if (!LOG_CONFIG.enableDatabase) return;
  
  try {
    // FIXED: Using 'created_at' instead of 'timestamp'
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        level: entry.level,
        message: entry.message,
        user_id: entry.user?.id,
        data: entry.data,
        created_at: entry.timestamp  // FIXED: Use created_at
      }]);
    
    if (error) {
      console.error('Failed to log to database:', error);
    }
  } catch (error) {
    console.error('Failed to send log to database:', error);
  }
};

export const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      const entry = formatLogEntry(LogLevel.DEBUG, message, data);
      if (LOG_CONFIG.enableConsole) {
        console.debug(`[DEBUG] ${entry.timestamp} - ${message}`, data);
      }
    }
  },
  
  info: (message: string, data?: any) => {
    const entry = formatLogEntry(LogLevel.INFO, message, data);
    if (LOG_CONFIG.enableConsole) {
      console.log(`[INFO] ${entry.timestamp} - ${message}`, data);
    }
    sendToDatabase(entry);
  },
  
  warn: (message: string, data?: any) => {
    const entry = formatLogEntry(LogLevel.WARN, message, data);
    if (LOG_CONFIG.enableConsole) {
      console.warn(`[WARN] ${entry.timestamp} - ${message}`, data);
    }
    sendToDatabase(entry);
  },
  
  error: (message: string, error?: any, data?: any) => {
    const entry = formatLogEntry(LogLevel.ERROR, message, { error, data });
    if (LOG_CONFIG.enableConsole) {
      console.error(`[ERROR] ${entry.timestamp} - ${message}`, error, data);
    }
    sendToDatabase(entry);
  },
  
  critical: (message: string, error?: any, data?: any) => {
    const entry = formatLogEntry(LogLevel.CRITICAL, message, { error, data });
    if (LOG_CONFIG.enableConsole) {
      console.error(`[CRITICAL] ${entry.timestamp} - ${message}`, error, data);
    }
    sendToDatabase(entry);
  }
};