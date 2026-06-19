// src/utils/rollback.ts

import { logger } from './logging';
import { triggerCritical } from './alerts';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export const VERSION = '2.0.0';
export const PREVIOUS_VERSION = '1.9.0';

export interface FeatureFlags {
  newPayrollSystem: boolean;
  attendanceDeductions: boolean;
  bulkPayslips: boolean;
  enhancedReporting: boolean;
  mobileOptimized: boolean;
  [key: string]: boolean;
}

const DEFAULT_FEATURES: FeatureFlags = {
  newPayrollSystem: true,
  attendanceDeductions: true,
  bulkPayslips: true,
  enhancedReporting: false,
  mobileOptimized: false
};

const FEATURE_FLAG_KEY = 'safeguard_feature_flags';

export class RollbackManager {
  private features: FeatureFlags;
  private version: string;
  private previousVersion: string;
  private rollbackInProgress: boolean = false;

  constructor() {
    this.version = VERSION;
    this.previousVersion = PREVIOUS_VERSION;
    this.features = this.loadFeatures();
  }

  private loadFeatures(): FeatureFlags {
    try {
      const saved = localStorage.getItem(FEATURE_FLAG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_FEATURES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading features:', error);
    }
    return { ...DEFAULT_FEATURES };
  }

  private saveFeatures(features: FeatureFlags): void {
    try {
      localStorage.setItem(FEATURE_FLAG_KEY, JSON.stringify(features));
    } catch (error) {
      console.error('Error saving features:', error);
    }
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.features[feature] !== false;
  }

  enableFeature(feature: keyof FeatureFlags): void {
    this.features[feature] = true;
    this.saveFeatures(this.features);
    logger.info(`Feature enabled: ${feature}`);
  }

  disableFeature(feature: keyof FeatureFlags): void {
    this.features[feature] = false;
    this.saveFeatures(this.features);
    logger.warn(`Feature disabled: ${feature}`);
  }

  toggleFeature(feature: keyof FeatureFlags): boolean {
    this.features[feature] = !this.features[feature];
    this.saveFeatures(this.features);
    logger.info(`Feature toggled: ${feature} = ${this.features[feature]}`);
    return this.features[feature];
  }

  getAllFeatures(): FeatureFlags {
    return { ...this.features };
  }

  async healthCheck(): Promise<{ healthy: boolean; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      const dbCheck = await this.checkDatabase();
      checks.database = dbCheck;
      if (!dbCheck) allHealthy = false;

      const apiCheck = await this.checkAPI();
      checks.api = apiCheck;
      if (!apiCheck) allHealthy = false;

      checks.criticalFeatures = this.checkCriticalFeatures();
      if (!checks.criticalFeatures) allHealthy = false;

    } catch (error) {
      logger.error('Health check failed:', error);
      allHealthy = false;
      checks.error = false;
    }

    return { healthy: allHealthy, checks };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  private async checkAPI(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  private checkCriticalFeatures(): boolean {
    try {
      const criticalFeatures = ['newPayrollSystem', 'attendanceDeductions'];
      for (const feature of criticalFeatures) {
        if (!this.isEnabled(feature as keyof FeatureFlags)) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async rollback(version: string = this.previousVersion): Promise<{ success: boolean; message: string }> {
    if (this.rollbackInProgress) {
      return { success: false, message: 'Rollback already in progress' };
    }

    this.rollbackInProgress = true;
    logger.critical(`🚨 Starting rollback to version ${version} from ${this.version}`);

    try {
      Object.keys(this.features).forEach(key => {
        this.features[key] = false;
      });
      this.saveFeatures(this.features);
      logger.info('All new features disabled');

      await this.clearCache();
      logger.info('Application cache cleared');

      const health = await this.healthCheck();
      if (!health.healthy) {
        throw new Error('Health check failed after rollback');
      }

      triggerCritical(`Rollback completed to version ${version}`, null, {
        previousVersion: this.version,
        newVersion: version,
        timestamp: new Date().toISOString()
      });

      this.rollbackInProgress = false;
      return { 
        success: true, 
        message: `Successfully rolled back to version ${version}` 
      };
    } catch (error: any) {
      logger.critical('Rollback failed:', error);
      this.rollbackInProgress = false;
      return { 
        success: false, 
        message: `Rollback failed: ${error.message}` 
      };
    }
  }

  private async clearCache(): Promise<void> {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export const rollbackManager = new RollbackManager();

export const useFeatureFlag = (feature: keyof FeatureFlags): [boolean, () => void] => {
  const [enabled, setEnabled] = useState(rollbackManager.isEnabled(feature));
  
  const toggle = () => {
    const newState = rollbackManager.toggleFeature(feature);
    setEnabled(newState);
  };
  
  return [enabled, toggle];
};