import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lodash': 'lodash-es',
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    // ===== CRITICAL: Better chunk splitting =====
    rollupOptions: {
      output: {
        manualChunks: {
          // Core - loaded first
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI - loaded second
          'vendor-ui': ['lucide-react', 'sonner', 'clsx', 'tailwind-merge'],
          // Charts - loaded on demand (not in initial bundle)
          'vendor-charts': ['recharts'],
          // PDF - loaded on demand
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          // Supabase - loaded second
          'vendor-supabase': ['@supabase/supabase-js'],
        },
        // ===== NEW: Limit chunk size =====
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // ===== NEW: Warn if chunks are too big =====
    chunkSizeWarningLimit: 300,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'sonner',
      'lodash-es',
    ],
    // ===== NEW: Don't pre-bundle large libraries =====
    exclude: ['recharts', 'jspdf', 'html2canvas'],
  },
})