import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { PdfReaderPageProps } from '../../features/reader/contract/pdfReaderContract';
import { loadPdfReader } from '../../features/reader/logic/loadPdfReader';
import type { AppViewMode, UseAppViewModeOptions, UseAppViewModeResult } from '../contract/appShellScreenContract';

export const useAppViewMode = ({
  isMobileApp,
  initialViewMode = 'archive',
}: UseAppViewModeOptions): UseAppViewModeResult => {
  const [viewMode, setViewMode] = useState<AppViewMode>(initialViewMode);
  const [Reader, setReader] = useState<ComponentType<PdfReaderPageProps> | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerLoadError, setReaderLoadError] = useState(false);
  const loadGeneration = useRef(0);
  const cancelReaderLoad = useCallback(() => {
    loadGeneration.current += 1;
    setReaderLoading(false);
    setReaderLoadError(false);
  }, []);

  const openReader = useCallback(async () => {
    if (isMobileApp) return;
    if (Reader) { setViewMode('reader'); return; }
    const generation = ++loadGeneration.current;
    setReaderLoading(true);
    setReaderLoadError(false);
    try {
      const module = await loadPdfReader();
      if (generation !== loadGeneration.current) return;
      setReader(() => module.PdfReaderPage);
      setViewMode('reader');
    } catch {
      if (generation === loadGeneration.current) setReaderLoadError(true);
    } finally {
      if (generation === loadGeneration.current) setReaderLoading(false);
    }
  }, [isMobileApp, Reader]);

  useEffect(() => () => { loadGeneration.current += 1; }, []);

  useEffect(() => {
    const restoreArchive = () => {
      cancelReaderLoad();
      setViewMode('archive');
    };
    window.addEventListener('popstate', restoreArchive);
    return () => window.removeEventListener('popstate', restoreArchive);
  }, [cancelReaderLoad]);

  useEffect(() => {
    if (isMobileApp) {
      cancelReaderLoad();
      setViewMode('archive');
    }
  }, [isMobileApp, cancelReaderLoad]);

  return {
    viewMode,
    Reader,
    readerLoading,
    readerLoadError,
    cancelReaderLoad,
    isReaderVisible: !isMobileApp && viewMode === 'reader',
    openArchive: () => { cancelReaderLoad(); setViewMode('archive'); },
    openReader,
    setViewMode,
  };
};
