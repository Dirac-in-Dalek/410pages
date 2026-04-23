import React from 'react';
import { PdfReaderPage } from '../../../components/pdf-reader/PdfReaderPage';

type ReaderScreenProps = React.ComponentProps<typeof PdfReaderPage>;

export const ReaderScreen: React.FC<ReaderScreenProps> = (props) => {
  return <PdfReaderPage {...props} />;
};
