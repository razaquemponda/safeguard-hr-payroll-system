// src/utils/securityHeaders.ts

// This file provides security-related utilities for your app

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\\/g, '&#92;')
    .replace(/;/g, '&#59;')
    .replace(/--/g, '&#45;&#45;')
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|CREATE|TRUNCATE|EXEC|EXECUTE)\b/gi, '');
};

/**
 * Sanitize HTML content before rendering
 */
export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  const element = document.createElement('div');
  element.textContent = input;
  return element.innerHTML;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Malawi format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneClean = phone.replace(/\s/g, '');
  const phoneRegex = /^(\+265|0)[1-9]\d{7,8}$/;
  return phoneRegex.test(phoneClean);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};