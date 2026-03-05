import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeNativePlatform } from './services/nativePlatformService';

initializeNativePlatform();

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  // Log error for debugging (these are stripped in production by esbuild)
  console.error('Global error:', { message, source, lineno, colno, error });
  // Prevent default browser error handling - app error boundaries will handle UI
  return false;
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the error from crashing the app
  event.preventDefault();
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
