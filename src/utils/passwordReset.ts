// src/utils/passwordReset.ts

import { supabase } from '../lib/supabase';
import { showNotification } from './clickHandlers';
import { useState } from 'react';

export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'admin123', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'hello'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password.');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      };
    }
    
    console.log(`Password reset requested for email: ${email}`);
    
    return {
      success: true,
      message: 'Password reset link sent to your email. It will expire in 1 hour.'
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to process password reset. Please try again later.'
    };
  }
};

export const updatePassword = async (
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (newPassword !== confirmPassword) {
      return {
        success: false,
        message: 'Passwords do not match'
      };
    }
    
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return {
        success: false,
        message: strength.errors.join('. ')
      };
    }
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      if (error.message.includes('session')) {
        return {
          success: false,
          message: 'Your reset link has expired. Please request a new one.'
        };
      }
      return {
        success: false,
        message: 'Failed to update password. Please try again.'
      };
    }
    
    console.log(`Password updated for user: ${data?.user?.email}`);
    
    return {
      success: true,
      message: 'Password updated successfully! Redirecting to login...'
    };
  } catch (error: any) {
    console.error('Password update error:', error);
    return {
      success: false,
      message: 'Failed to update password. Please try again later.'
    };
  }
};