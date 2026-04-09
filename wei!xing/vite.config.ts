import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /** 监听 0.0.0.0，localhost / 127.0.0.1 / 本机 IP 均可访问 */
    host: true,
    /** 执行 npm run dev 时自动用系统浏览器打开 */
    open: true,
    port: 5173,
    /** 5173 被占用时自动尝试下一个端口，避免启动失败 */
    strictPort: false,
  },
})
