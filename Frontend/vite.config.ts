// import path from 'path';
// import { defineConfig, loadEnv } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig(({ mode }) => {
//     const env = loadEnv(mode, '.', '');
//     return {
//       server: {
//         port: 3000,
//         host: '0.0.0.0',
//       },
//       plugins: [react()],
//       define: {
//         'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
//         'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
//       },
//       resolve: {
//         alias: {
//           '@': path.resolve(__dirname, '.'),
//         }
//       }
//     };
// });
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  if (!env.VITE_API_BASE_URL) throw new Error("CRITICAL: VITE_API_BASE_URL is missing from environment variables.");
  if (!env.FRONTEND_PORT) throw new Error("CRITICAL: FRONTEND_PORT is missing from environment variables.");

  // Parse the base API URL to get the host origin for proxying
  const targetUrl = new URL(env.VITE_API_BASE_URL).origin;
  const frontendPort = parseInt(env.FRONTEND_PORT, 10);

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      allowedHosts: true, // <-- THIS FIXES THE NGROK BLOCKED HOST ERROR
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
        }
      }
    }
  }
})