import { resolve } from 'path';
import { defineConfig } from 'vite';

// static content is expected in public/ (for example data.json)

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'index.html': resolve(__dirname, 'index.html'),
      },
    }
  }
});
