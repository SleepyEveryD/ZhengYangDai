import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,

    // ✅ 关键：把 /rides 转发到 Nest 后端
    proxy: {
      '/rides': {
        target: 'http://localhost:3000', // 👈 改成你 Nest 实际端口
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), tailwindcss()],
});