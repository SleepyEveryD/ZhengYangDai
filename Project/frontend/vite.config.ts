import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // 👇 加载 env
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      port: 5173,
      strictPort: true,
      historyApiFallback: true,

      proxy: {
        // ✅ 只代理 API
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), tailwindcss()],
  };
});
