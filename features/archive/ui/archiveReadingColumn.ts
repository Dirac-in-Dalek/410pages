export const getArchiveReadingColumnClass = ({
  isMobileApp = false,
}: {
  isBookView: boolean;
  isMobileApp?: boolean;
}) => {
  if (isMobileApp) {
    return 'mx-auto w-full max-w-5xl px-3';
  }

  return [
    'mx-auto w-full px-5 sm:px-6 xl:px-0',
    'max-w-[var(--citation-column-width)]',
  ].join(' ');
};
