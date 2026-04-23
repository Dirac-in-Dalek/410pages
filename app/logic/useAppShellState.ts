import { useEffect, useState } from 'react';

type UseAppShellStateParams = {
  sessionUserId?: string;
  fetchData: () => Promise<void>;
  selectedBookId: string | null;
  handleLoadChapterBlocks: (bookId: string) => Promise<void>;
};

export const useAppShellState = ({
  sessionUserId,
  fetchData,
  selectedBookId,
  handleLoadChapterBlocks,
}: UseAppShellStateParams) => {
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  useEffect(() => {
    if (sessionUserId) {
      void fetchData();
    }
  }, [fetchData, sessionUserId]);

  useEffect(() => {
    if (!selectedBookId) {
      return;
    }

    void handleLoadChapterBlocks(selectedBookId);
  }, [handleLoadChapterBlocks, selectedBookId]);

  return {
    showBatchDeleteModal,
    setShowBatchDeleteModal,
  };
};
