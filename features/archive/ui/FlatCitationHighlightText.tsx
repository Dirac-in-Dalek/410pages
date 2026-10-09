import type { CitationUpdate } from '../../../types';
import React from 'react';
import type { Citation } from '../../../types';
import { FormattedText } from '../../../shared/ui/FormattedText';
import { formatsWithLegacyHighlights, legacyHighlightsFromFormats } from '../../../shared/logic/textFormats';

type FlatCitationHighlightTextProps = {
  citation: Citation;
  disabled?: boolean;
  onUpdate: (id: string, data: CitationUpdate, expectedText?: string) => unknown | Promise<unknown>;
  onHighlight: () => void;
};

export const FlatCitationHighlightText: React.FC<FlatCitationHighlightTextProps> = ({ citation, disabled = false, onUpdate, onHighlight }) => <FormattedText
  text={citation.text}
  bookCitation
  formats={formatsWithLegacyHighlights(citation.text, citation.textFormats, citation.highlights)}
  testId={`book-citation-text-${citation.id}`}
  onSelect={onHighlight}
  onSave={disabled ? undefined : formats => onUpdate(citation.id, { textFormats: formats, highlights: legacyHighlightsFromFormats(formats) }, citation.text)}
  className="block cursor-text select-text whitespace-pre-wrap break-words font-[family-name:var(--font-display-active)] text-[length:var(--type-body-size)] leading-[1.72] text-[var(--text-main)]"
/>;
