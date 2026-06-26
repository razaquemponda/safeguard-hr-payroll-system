import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lodash': 'lodash-es',
      // ===== FIX: Alias react-is correctly =====
      'react-is': 'react-is/index.js',
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'sonner'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 500,
    // ===== FIX: Add commonjs options =====
    commonjsOptions: {
      include: [/react-is/, /node_modules/],
    },
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
      'react-is',
      'es-toolkit',
      'recharts',
    ],
    exclude: ['jspdf', 'html2canvas'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
})