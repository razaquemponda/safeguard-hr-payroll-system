import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // ============================================ //
    // SECURITY HEADERS - ADDED FOR PROTECTION      //
    // ============================================ //
    headers: {
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Content Security Policy - Prevents XSS
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      
      // HSTS - Force HTTPS in production
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Permissions Policy - Restrict browser features
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=()',
    },
  },
  // ============================================ //
  // BUILD OPTIMIZATION FOR PRODUCTION            //
  // ============================================ //
  build: {
    // Generate source maps for debugging (remove in production)
    sourcemap: true,
    // Minify code for production
    minify: 'esbuild',
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})