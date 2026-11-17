import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const proxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react(), viteStaticCopy({
    targets: ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map((directory) => ({
      src: `node_modules/pdfjs-dist/${directory}/*`,
      dest: `pdfjs/${directory}`,
      rename: { stripBase: true },
    })),
  })],
  server: { proxy },
  preview: { proxy },
});
