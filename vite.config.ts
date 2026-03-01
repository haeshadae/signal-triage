import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Anthropic API calls to avoid CORS in dev
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
      // Proxy Slack webhook calls to avoid CORS in dev
      '/api/slack': {
        target: 'https://hooks.slack.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/slack/, ''),
      },
    },
  },
})
