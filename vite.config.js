import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the repo at /portfolio-3d/
  base: '/portfolio-3d/',
  // three alone is ~550 kB minified, split it out only if load time becomes a problem
  build: { chunkSizeWarningLimit: 800 }
});
