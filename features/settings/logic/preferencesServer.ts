import { getSupabaseClient } from '../../../lib/supabase';
import type { UserPreferences } from '../contract/userPreferences';
import { normalizePreferences } from './preferencesNormalization';

type PreferencesProfileRow = {
  preferences: unknown;
};

export const readServerPreferences = async (userId: string): Promise<UserPreferences | null> => {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle<PreferencesProfileRow>();

  if (error) {
    throw error;
  }

  return data?.preferences ? normalizePreferences(data.preferences) : null;
};

export const persistServerPreferences = async (
  userId: string,
  preferences: UserPreferences
) => {
  const { error } = await getSupabaseClient()
    .from('profiles')
    .upsert({ id: userId, preferences }, { onConflict: 'id' });

  if (error) {
    throw error;
  }
};
