import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import jsconfigPaths from 'vite-jsconfig-paths'

const mode = process.env.NODE_ENV || 'development'
const env = loadEnv(mode, process.cwd(), '')
export default defineConfig({
  plugins: [react(), jsconfigPaths()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    proxy: {
      '/api/v2': {
        target: env.VITE_BACKEND_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v2/, '/api/v2'),
      },
    },
  },
  test: {
    globals: true, // 👈 Cho phép dùng jest, describe, test, expect, v.v. như global
    environment: 'jsdom', // 👈 Để test React component
    setupFiles: './src/setupTests.js',
    mockReset: true, // 👈 reset mock giữa các test case
  },
})
