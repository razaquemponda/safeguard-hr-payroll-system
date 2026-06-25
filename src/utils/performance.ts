// src/utils/performance.ts

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

const marks: PerformanceMark[] = [];

/**
 * Measure performance of a specific operation
 */
export const measurePerformance = (label: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      const mark: PerformanceMark = {
        name: label,
        startTime: start,
        endTime: performance.now(),
        duration: duration,
      };
      marks.push(mark);
      
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // You can send to your analytics service here
        // e.g., analytics.track('performance', { label, duration });
      }
      
      return duration;
    }
  };
};

/**
 * Get all performance marks
 */
export const getPerformanceMarks = () => {
  return [...marks];
};

/**
 * Clear all performance marks
 */
export const clearPerformanceMarks = () => {
  marks.length = 0;
};

/**
 * Get performance summary
 */
export const getPerformanceSummary = () => {
  const totalDuration = marks.reduce((sum, mark) => sum + (mark.duration || 0), 0);
  const averageDuration = marks.length > 0 ? totalDuration / marks.length : 0;
  
  return {
    totalMarks: marks.length,
    totalDuration: totalDuration,
    averageDuration: averageDuration,
    slowest: [...marks].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0],
    fastest: [...marks].sort((a, b) => (a.duration || 0) - (b.duration || 0))[0],
  };
};

/**
 * Monitor page load performance
 */
export const monitorPageLoad = () => {
  if (typeof window === 'undefined') return;
  
  // Wait for page to fully load
  window.addEventListener('load', () => {
    const perfData = performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    
    console.log(`📊 Page Load: ${loadTime}ms`);
    console.log(`📊 DOM Ready: ${domReady}ms`);
    
    // Send to analytics
    if (process.env.NODE_ENV === 'production') {
      // analytics.track('page_load', { loadTime, domReady });
    }
  });
};

/**
 * Measure component render time
 */
export const measureRender = (componentName: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 ${componentName} rendered in ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
};

/**
 * Check if performance is slow
 */
export const isPerformanceSlow = (threshold: number = 3000) => {
  const perfData = performance.timing;
  const loadTime = perfData.loadEventEnd - perfData.navigationStart;
  return loadTime > threshold;
};

// Auto-monitor page load
if (typeof window !== 'undefined') {
  monitorPageLoad();
}