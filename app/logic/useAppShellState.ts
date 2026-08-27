import { useEffect } from 'react';

type UseAppShellStateParams = {
  sessionUserId?: string;
  fetchData: () => Promise<void>;
  selectedBookId: string | null;
  handleLoadChapterBlocks: (bookId: string) => Promise<void>;
  cancelChapterBlockLoad: () => void;
};

export const useAppShellState = ({
  sessionUserId,
  fetchData,
  selectedBookId,
  handleLoadChapterBlocks,
  cancelChapterBlockLoad,
}: UseAppShellStateParams) => {
  useEffect(() => {
    if (sessionUserId) {
      void fetchData();
    }
  }, [fetchData, sessionUserId]);

  useEffect(() => {
    if (!selectedBookId) {
      cancelChapterBlockLoad();
      return;
    }

    void handleLoadChapterBlocks(selectedBookId);
    return cancelChapterBlockLoad;
  }, [cancelChapterBlockLoad, handleLoadChapterBlocks, selectedBookId]);
};
