import { resolve } from 'path';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html'

// static content is expected in public/ (for example data.json)

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: true,
      template: 'index.html',
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        'index.html': resolve(__dirname, 'index.html'),
      },
    }
  }
});
