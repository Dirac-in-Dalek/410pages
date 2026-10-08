import { getSupabaseClient } from '../../lib/supabase';
import type { TextFormatRange } from '../../types';
import { requireActiveUser } from './libraryApiUtils';
import { normalizeTextFormats } from '../logic/textFormats';

export async function saveTextFormatting(userId: string, kind: 'citation' | 'note' | 'memo', id: string,
  expectedText: string, text: string, formats: TextFormatRange[]) {
  await requireActiveUser(userId, 'text formatting update');
  const { error } = await getSupabaseClient().rpc('save_text_formatting', {
    target_kind: kind, target_id: id, expected_text: expectedText,
    requested_text: text, requested_formats: normalizeTextFormats(formats, text.length),
  });
  if (error) throw error;
}
