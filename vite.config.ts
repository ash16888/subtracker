/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'coverage/**',
        'dist/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      include: [
        'src/**/*.{ts,tsx,js,jsx}'
      ],
      all: true,
      clean: true
    }
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@hookform/resolvers', 'react-hook-form', 'zod']
        }
      }
    }
  }
})