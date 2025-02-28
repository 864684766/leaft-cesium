import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import jsx from "@vitejs/plugin-vue-jsx";
import cesium from "vite-plugin-cesium";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), jsx(), cesium()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@views": path.resolve(__dirname, "./src/views"),
      "@styles": path.resolve(__dirname, "./src/styles"),
    },
  },
});
