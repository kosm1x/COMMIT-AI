import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable fast refresh for better dev experience
      fastRefresh: true,
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    // Include frequently used deps for faster dev startup
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    // Exclude large deps that should be bundled differently
    exclude: ['mermaid'],
  },
  build: {
    // Use esbuild for faster builds (default)
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Disable sourcemaps for production (smaller bundle)
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Optimize chunking strategy for better caching
        manualChunks: {
          // React ecosystem - frequently used, cache together
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase - auth and data layer
          'supabase-vendor': ['@supabase/supabase-js'],
        },
        // Use content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Inline small assets for fewer requests
    assetsInlineLimit: 4096,
    // Report compressed sizes
    reportCompressedSize: true,
  },
  // Resolve optimization
  resolve: {
    // Prefer .mjs for better tree-shaking
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  // Enable dependency pre-bundling caching
  cacheDir: 'node_modules/.vite',
  // CSS optimization
  css: {
    devSourcemap: false,
  },
  // Production optimizations via esbuild
  esbuild: {
    // Minify identifiers
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
});

