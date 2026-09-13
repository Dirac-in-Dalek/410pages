import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleBookMetadata } from './server/yes24.mjs';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, '.', '');
    return {
      optimizeDeps: { include: ['react-pdf'] },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), {
        name: 'pdf-reader-module-url',
        resolveId(id) { if (id === 'virtual:pdf-reader-url') return '\0pdf-reader-url'; },
        load(id) {
          if (id !== '\0pdf-reader-url') return;
          const readerPath = 'features/reader/ui/PdfReaderPage.tsx';
          if (command === 'serve') return `export default ${JSON.stringify('/' + readerPath)};`;
          const reference = this.emitFile({ type: 'chunk', id: path.resolve(__dirname, readerPath), preserveSignature: 'strict' });
          return `export default import.meta.ROLLUP_FILE_URL_${reference};`;
        },
      }, {
        name: 'local-book-metadata',
        configureServer(server) {
          server.middlewares.use('/api/book-metadata', (req, res) => {
            void handleBookMetadata(req, res, env);
          });
        },
      }],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
