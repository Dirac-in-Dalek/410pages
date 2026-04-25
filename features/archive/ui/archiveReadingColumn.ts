export const getArchiveReadingColumnClass = ({
  isBookView,
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
    isBookView ? 'max-w-[48rem]' : 'max-w-[54rem]',
  ].join(' ');
};
