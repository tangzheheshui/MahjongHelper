import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// 离线优先：App 壳 + 出厂题库全部预缓存（web-v1.md §二.4）
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["bank/*.json"],
      manifest: {
        name: "nanikiru 何切训练",
        short_name: "何切",
        description: "麻将拆搭 / 何切专项训练：题库练习 + 即时判分讲解",
        lang: "zh-CN",
        display: "standalone",
        orientation: "portrait",
        background_color: "#efece3",
        theme_color: "#efece3",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        navigateFallback: "/index.html",
        // 题库 JSON 更新走版本协议（M4），不让 SW 运行时缓存干扰
        navigateFallbackDenylist: [/^\/bank\//],
      },
    }),
  ],
  server: { port: 5173 },
});
