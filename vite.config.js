import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/detect/ws": {
          target: env.VEST_API_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
          ws: true,
          headers: env.VEST_API_KEY ? { "X-API-Key": env.VEST_API_KEY } : {},
          rewrite: () => env.VEST_API_KEY
            ? `/predict/ws?api_key=${encodeURIComponent(env.VEST_API_KEY)}`
            : "/predict/ws",
          configure: (proxy) => {
            if (env.VEST_API_KEY) {
              proxy.on("proxyReqWs", (proxyReq) => {
                proxyReq.setHeader("X-API-Key", env.VEST_API_KEY);
                proxyReq.path = env.VEST_API_KEY
                  ? `/predict/ws?api_key=${encodeURIComponent(env.VEST_API_KEY)}`
                  : "/predict/ws";
              });
            }
          },
        },
        "/api/detect": {
          target: env.VEST_API_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: () => "/predict",
          configure: (proxy) => {
            if (env.VEST_API_KEY) {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader("X-API-Key", env.VEST_API_KEY);
              });
            }
          },
        },
      },
    },
  };
});
