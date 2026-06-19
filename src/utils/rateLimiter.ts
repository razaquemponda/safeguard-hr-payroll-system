// src/utils/rateLimiter.ts

import { useState } from 'react';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    windowStart: number;
  };
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

const rateLimitStore: RateLimitStore = {};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000,
  blockDurationMs: 5 * 60 * 1000
};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export const checkRateLimit = (
  userId: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetTime: number } => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const userLimit = rateLimitStore[userId];
  
  if (!userLimit) {
    rateLimitStore[userId] = {
      count: 1,
      resetTime: now + finalConfig.windowMs,
      windowStart: now
    };
    return { allowed: true, remaining: finalConfig.maxRequests - 1, resetTime: rateLimitStore[userId].resetTime };
  }
  
  if (now > userLimit.resetTime) {
    rateLimitStore[userId] = {
      count: 1,
      resetTime: now + finalConfig.windowMs,
      windowStart: now
    };
    return { allowed: true, remaining: finalConfig.maxRequests - 1, resetTime: rateLimitStore[userId].resetTime };
  }
  
  const blockTime = userLimit.resetTime + (finalConfig.blockDurationMs || 0);
  if (now > blockTime && userLimit.count >= finalConfig.maxRequests) {
    rateLimitStore[userId] = {
      count: 1,
      resetTime: now + finalConfig.windowMs,
      windowStart: now
    };
    return { allowed: true, remaining: finalConfig.maxRequests - 1, resetTime: rateLimitStore[userId].resetTime };
  }
  
  if (userLimit.count >= finalConfig.maxRequests) {
    const remainingTime = Math.ceil((blockTime - now) / 1000);
    return { allowed: false, remaining: 0, resetTime: blockTime };
  }
  
  userLimit.count++;
  
  return {
    allowed: true,
    remaining: finalConfig.maxRequests - userLimit.count,
    resetTime: userLimit.resetTime
  };
};

export const withRateLimit = async <T>(
  userId: string,
  fn: () => Promise<T>,
  config: Partial<RateLimitConfig> = {}
): Promise<T | null> => {
  const result = checkRateLimit(userId, config);
  
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
  }
  
  try {
    return await fn();
  } catch (error) {
    throw error;
  }
};