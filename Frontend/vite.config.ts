import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Para rodar o front local contra uma API remota (o Render, por exemplo):
      // defina VITE_PROXY_TARGET e VITE_API_URL=/api/v1 no seu .env.local.
      // A chamada passa a sair do Vite, servidor a servidor, entao nao esbarra
      // no CORS, que a API so libera para a origem do site publicado.
      // Sem a variavel definida, nada muda.
      proxy: env.VITE_PROXY_TARGET
        ? {
            '/api': {
              target: env.VITE_PROXY_TARGET,
              changeOrigin: true,
              secure: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  // O Spring Security responde 403 quando o Origin nao esta na
                  // allowlist da API. Aqui a chamada sai do Vite, servidor a
                  // servidor, entao o header nao faz falta e so atrapalha.
                  proxyReq.removeHeader('origin');
                });
              },
            },
          }
        : undefined,
    },
  };
});
