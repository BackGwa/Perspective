import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

const packageJson = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, './package.json'), 'utf-8'))
const version = packageJson.version || '0.0.0'
const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@assets': path.resolve(import.meta.dirname, './assets'),
      '@styles': path.resolve(import.meta.dirname, './styles')
    }
  },
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'oxc',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true
          }
        }
      }
    }
  }
})
