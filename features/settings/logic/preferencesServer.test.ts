import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({
  maybeSingle: mockMaybeSingle,
}));
const mockSelect = vi.fn(() => ({
  eq: mockEq,
}));
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

vi.mock('../../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
  }),
}));

import { readServerPreferences, persistServerPreferences } from './preferencesServer';

describe('preferencesServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads and normalizes server preferences from the profile row', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        preferences: {
          theme: 'night',
          fontFamily: 'serif',
          baseFontPt: 18.4,
          citationWidthRem: 49.6,
        },
      },
      error: null,
    });

    await expect(readServerPreferences('user-1')).resolves.toEqual({
      theme: 'night',
      fontFamily: 'serif',
      baseFontPt: 18,
      citationWidthRem: 50,
    });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('preferences');
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('returns null when the profile has no stored preferences', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { preferences: null },
      error: null,
    });

    await expect(readServerPreferences('user-1')).resolves.toBeNull();
  });

  it('upserts preferences into the profile row', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await persistServerPreferences('user-1', {
      theme: 'day',
      fontFamily: 'pretendard',
      baseFontPt: 16,
      citationWidthRem: 44,
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: 'user-1',
        preferences: {
          theme: 'day',
          fontFamily: 'pretendard',
          baseFontPt: 16,
          citationWidthRem: 44,
        },
      },
      { onConflict: 'id' }
    );
  });
});
