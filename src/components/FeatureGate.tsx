// src/components/FeatureGate.tsx

import React from 'react';
import { rollbackManager, FeatureFlags } from '../utils/rollback';

interface FeatureGateProps {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback = null 
}) => {
  if (!rollbackManager.isEnabled(feature)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

export const useFeature = (feature: keyof FeatureFlags) => {
  const [enabled, setEnabled] = React.useState(rollbackManager.isEnabled(feature));
  
  const toggle = React.useCallback(() => {
    const newState = rollbackManager.toggleFeature(feature);
    setEnabled(newState);
  }, [feature]);
  
  const enable = React.useCallback(() => {
    rollbackManager.enableFeature(feature);
    setEnabled(true);
  }, [feature]);
  
  const disable = React.useCallback(() => {
    rollbackManager.disableFeature(feature);
    setEnabled(false);
  }, [feature]);
  
  return { enabled, toggle, enable, disable };
};