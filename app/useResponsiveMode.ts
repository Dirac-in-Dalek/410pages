import { useEffect, useState } from 'react';

export const useResponsiveMode = () => {
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    const widthQuery = window.matchMedia('(max-width: 1024px)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const checkMobileApp = () => setIsMobileApp(widthQuery.matches || coarsePointerQuery.matches);

    const addQueryListener = (query: MediaQueryList, listener: () => void) => {
      if (query.addEventListener) {
        query.addEventListener('change', listener);
      } else {
        query.addListener(listener);
      }
    };

    const removeQueryListener = (query: MediaQueryList, listener: () => void) => {
      if (query.removeEventListener) {
        query.removeEventListener('change', listener);
      } else {
        query.removeListener(listener);
      }
    };

    checkMobileApp();
    addQueryListener(widthQuery, checkMobileApp);
    addQueryListener(coarsePointerQuery, checkMobileApp);
    window.addEventListener('orientationchange', checkMobileApp);
    window.addEventListener('resize', checkMobileApp);

    return () => {
      removeQueryListener(widthQuery, checkMobileApp);
      removeQueryListener(coarsePointerQuery, checkMobileApp);
      window.removeEventListener('orientationchange', checkMobileApp);
      window.removeEventListener('resize', checkMobileApp);
    };
  }, []);

  return { isMobileApp };
};
