import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "./",
  plugins: [
    // TODO: add @vitejs/plugin-legacy
    // https://github.com/vitejs/vite/tree/main/packages/plugin-legacy
    svelte(),
  ],
  build: {
    minify: false,
    sourcemap: true,
  },
});
