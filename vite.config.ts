import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
    ],
    exclude: ['lucide-react'],
  },
  build: {
    // Use esbuild for fast minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Disable sourcemaps for production (smaller bundle)
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Optimize chunking for better caching
        manualChunks: {
          // React ecosystem - frequently used, cache together
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase - auth and data layer
          'supabase-vendor': ['@supabase/supabase-js'],
          // Mermaid - heavy diagram library, load separately
          'mermaid-vendor': ['mermaid'],
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
  // Production optimizations via esbuild
  esbuild: {
    // Drop console.log and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Minification options
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
});
