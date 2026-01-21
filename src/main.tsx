import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  // In production, you could send this to an error tracking service
  return false;
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (logging to console)
  // but don't crash the app
  event.preventDefault();
};

// Performance monitoring - log slow page loads
if (typeof window !== 'undefined' && 'performance' in window) {
  window.addEventListener('load', () => {
    // Use requestIdleCallback to avoid blocking
    const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
    scheduleIdle(() => {
      const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (perfEntries.length > 0) {
        const navEntry = perfEntries[0];
        const loadTime = navEntry.loadEventEnd - navEntry.startTime;
        if (loadTime > 3000 && import.meta.env.DEV) {
          console.warn(`Slow page load detected: ${Math.round(loadTime)}ms`);
        }
      }
    });
  });
}

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error('Root element not found');
}
