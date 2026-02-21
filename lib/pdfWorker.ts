import { pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let isConfigured = false;

export const configurePdfWorker = () => {
  if (isConfigured) return;

  // Keep worker local and cache-busted by version to avoid stale worker mismatches.
  pdfjs.GlobalWorkerOptions.workerSrc = `${workerSrc}?v=${pdfjs.version}`;

  isConfigured = true;
};
