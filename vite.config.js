import { defineConfig } from 'vite';

// Il sito è pubblicato su https://<utente>.github.io/Work-Manager-2/
// Se rinomini la repo, cambia anche `base`.
export default defineConfig({
  base: '/Work-Manager-2/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  server: { port: 5173 },
});
