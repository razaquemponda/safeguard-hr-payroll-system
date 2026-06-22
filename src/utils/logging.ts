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
  enableDatabase: false, // Temporarily disabled to prevent errors
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  user?: any;
  data?: any;
  environment?: string;
  trace?: string;
  tenant_id?: string;
}

// ===== Flag to prevent recursive logging =====
let isLogging = false;

const getUserContext = () => {
  try {
    const userStr = localStorage.getItem('sb-user') || 'null';
    const user = JSON.parse(userStr);
    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
};

// ===== Function to get current tenant ID =====
const getCurrentTenantId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    return data?.tenant_id || null;
  } catch (error) {
    console.error('Error getting tenant ID:', error);
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

// ===== UPDATED: sendToDatabase with recursion prevention =====
const sendToDatabase = async (entry: LogEntry) => {
  // Prevent recursive logging
  if (isLogging) {
    console.warn('Skipping recursive log attempt');
    return;
  }
  
  if (!LOG_CONFIG.enableDatabase) {
    // Silently skip if database logging is disabled
    return;
  }
  
  isLogging = true;
  
  try {
    // Get the current tenant ID
    const tenantId = await getCurrentTenantId();
    
    // If we can't get a tenant ID, skip logging to database
    if (!tenantId) {
      console.warn('Skipping log to database: No tenant_id available');
      return;
    }
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        level: entry.level,
        message: entry.message,
        user_id: entry.user?.id,
        data: entry.data,
        created_at: entry.timestamp,
        tenant_id: tenantId
      }]);
    
    if (error) {
      // Use direct console.log to avoid recursion
      console.error('Failed to log to database:', error);
    }
  } catch (error) {
    // Use direct console.log to avoid recursion
    console.error('Failed to send log to database:', error);
  } finally {
    isLogging = false;
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
    // Only send to database if not in development
    if (process.env.NODE_ENV === 'production') {
      sendToDatabase(entry);
    }
  },
  
  warn: (message: string, data?: any) => {
    const entry = formatLogEntry(LogLevel.WARN, message, data);
    if (LOG_CONFIG.enableConsole) {
      console.warn(`[WARN] ${entry.timestamp} - ${message}`, data);
    }
    // Only send to database if not in development
    if (process.env.NODE_ENV === 'production') {
      sendToDatabase(entry);
    }
  },
  
  error: (message: string, error?: any, data?: any) => {
    const entry = formatLogEntry(LogLevel.ERROR, message, { error, data });
    if (LOG_CONFIG.enableConsole) {
      console.error(`[ERROR] ${entry.timestamp} - ${message}`, error, data);
    }
    // Only send to database if not in development
    if (process.env.NODE_ENV === 'production') {
      sendToDatabase(entry);
    }
  },
  
  critical: (message: string, error?: any, data?: any) => {
    const entry = formatLogEntry(LogLevel.CRITICAL, message, { error, data });
    if (LOG_CONFIG.enableConsole) {
      console.error(`[CRITICAL] ${entry.timestamp} - ${message}`, error, data);
    }
    // Always send critical errors to database
    sendToDatabase(entry);
  }
};