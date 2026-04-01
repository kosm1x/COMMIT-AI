/**
 * Dev-aware logger. Errors always log (needed for production debugging).
 * Info/warn/debug are silenced in production builds.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
};
