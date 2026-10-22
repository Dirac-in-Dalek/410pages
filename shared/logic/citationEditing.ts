import type { Citation, CitationUpdate } from '../../types';
import { formatsWithLegacyHighlights, legacyHighlightsFromFormats, rebaseTextFormats } from './textFormats';

/** Saved and unsaved citations follow the same text/format offset rules. */
export function prepareCitationTextUpdate(
  citation: Pick<Citation, 'text' | 'textFormats' | 'highlights'>,
  update: CitationUpdate
): CitationUpdate {
  if (update.text === undefined || update.text === citation.text || update.textFormats !== undefined)
    return update;
  const formats = formatsWithLegacyHighlights(citation.text, citation.textFormats, citation.highlights);
  if (!formats.length) return update;
  const rebased = rebaseTextFormats(citation.text, update.text, formats);
  return { ...update, textFormats: rebased, highlights: legacyHighlightsFromFormats(rebased) };
}
