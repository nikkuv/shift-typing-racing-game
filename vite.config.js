import { defineConfig } from 'vite';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules/three')) return 'three';
    if (id.includes('node_modules/react')) return 'react';
  } } } }
});
