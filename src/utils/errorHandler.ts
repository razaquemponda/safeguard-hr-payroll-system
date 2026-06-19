// src/utils/errorHandler.ts

import { showNotification } from './clickHandlers';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public userMessage: string = 'Something went wrong. Please try again.'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection error') {
    super(message, 'NETWORK_ERROR', 0, 'Network error. Please check your internet connection.');
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401, 'Please log in to continue.');
    this.name = 'AuthError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'PERMISSION_ERROR', 403, 'You do not have permission to perform this action.');
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND_ERROR', 404, 'The requested resource was not found.');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', public validationErrors: string[] = []) {
    super(message, 'VALIDATION_ERROR', 400, 'Please check your input and try again.');
    this.name = 'ValidationError';
  }
}

export const handleError = (error: any): string => {
  console.error('Error occurred:', error);
  
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return 'Record not found. Please refresh and try again.';
      case '23505':
        return 'This record already exists. Please check your data.';
      case '23503':
        return 'This operation could not be completed due to related records.';
      case '42P01':
        return 'System error. Please try again later.';
      case '42501':
        return 'You do not have permission to perform this action.';
      case '22001':
        return 'Input is too long. Please shorten your text.';
      default:
        return 'Something went wrong. Please try again later.';
    }
  }
  
  if (error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  if (error?.message?.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  if (error?.message?.includes('session_expired')) {
    return 'Your session has expired. Please log in again.';
  }
  
  return 'Something went wrong. We are looking into it. Try refreshing or contact support if the problem persists.';
};

export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  fallbackValue?: T,
  showUserMessage: boolean = true
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    const userMessage = handleError(error);
    
    if (showUserMessage) {
      showNotification(userMessage, 'error');
    }
    
    console.error('Function execution failed:', error);
    
    return fallbackValue;
  }
};