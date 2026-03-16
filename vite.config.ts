import { defineConfig } from 'vitest/config'
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
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('@hookform/resolvers') || id.includes('react-hook-form') || id.includes('zod')) return 'ui'
        }
      }
    }
  }
})