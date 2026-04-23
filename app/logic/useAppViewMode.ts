import { useEffect, useState } from 'react';
import type { AppViewMode, UseAppViewModeOptions, UseAppViewModeResult } from '../contract/appShellScreenContract';

export const useAppViewMode = ({
  isMobileApp,
  initialViewMode = 'archive',
}: UseAppViewModeOptions): UseAppViewModeResult => {
  const [viewMode, setViewMode] = useState<AppViewMode>(initialViewMode);

  useEffect(() => {
    if (isMobileApp && viewMode === 'reader') {
      setViewMode('archive');
    }
  }, [isMobileApp, viewMode]);

  return {
    viewMode,
    isReaderVisible: !isMobileApp && viewMode === 'reader',
    openArchive: () => setViewMode('archive'),
    openReader: () => setViewMode('reader'),
    setViewMode,
  };
};
