import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    // 后端就绪后在此配置代理
    // proxy: {
    //   '/api': { target: 'http://localhost:8080', changeOrigin: true }
    // }
  },
})
