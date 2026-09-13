import readerModuleUrl from 'virtual:pdf-reader-url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

let attempt = 0;

export async function loadPdfReader(): Promise<typeof import('../ui/PdfReaderPage')> {
  // Failed module fetches are cached per URL. Retry without reloading or losing the current draft.
  const url = new URL(readerModuleUrl, window.location.href);
  url.searchParams.set('attempt', String(++attempt));
  return import(/* @vite-ignore */ url.href);
}
