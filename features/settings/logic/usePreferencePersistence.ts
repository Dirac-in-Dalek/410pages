import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserPreferences } from '../contract/userPreferences';
import { persistServerPreferences } from './preferencesServer';

export function usePreferencePersistence(
  userId: string | null | undefined,
  readyUserId: string | null,
  preferences: UserPreferences
) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const generation = useRef(0);
  const chain = useRef(Promise.resolve());

  const advanceGeneration = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    advanceGeneration();
    chain.current = Promise.resolve();
    setSaveError(null);
    return advanceGeneration;
  }, [advanceGeneration, userId]);

  useEffect(() => {
    if (!userId || readyUserId !== userId) return;
    const requestGeneration = generation.current;
    const timer = window.setTimeout(() => {
      chain.current = chain.current.then(async () => {
        if (generation.current !== requestGeneration) return;
        try {
          await persistServerPreferences(userId, preferences);
          if (generation.current === requestGeneration) setSaveError(null);
        } catch (error) {
          console.error('Error saving user preferences:', error);
          if (generation.current === requestGeneration) {
            setSaveError('설정을 저장하지 못했습니다. 다시 시도해 주세요.');
          }
        }
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [preferences, readyUserId, retryVersion, userId]);

  const retrySave = useCallback(() => setRetryVersion((version) => version + 1), []);
  return { saveError, retrySave };
}
