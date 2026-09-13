import { useCallback, useEffect, useRef, useState } from 'react';
import {
  updateConflictAlias,
  ensureConflictAlias,
  getConflictFirstName,
  updateConflictFirstName,
} from '@/lib/conflictRewards';

function cleanFirstName(value: string) {
  const clean = value.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 40 || /[<>\u0000-\u001F\u007F]/.test(clean)) {
    throw new Error('Enter a first name between 1 and 40 characters.');
  }
  return clean;
}

export function useConflictIdentity(userId?: string) {
  const [alias, setAlias] = useState('');
  const [firstName, setFirstName] = useState('Friend');
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAlias('');
      setFirstName('Friend');
      setLoading(false);
      setError('');
      return;
    }
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [nextAlias, nextFirstName] = await Promise.all([
        ensureConflictAlias(),
        getConflictFirstName(),
      ]);
      if (request !== generation.current) return;
      setAlias(nextAlias);
      setFirstName(nextFirstName);
    } catch (caught) {
      if (request === generation.current) {
        setError(caught instanceof Error ? caught.message : 'Your profile is unavailable right now.');
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    generation.current += 1;
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);

  const saveFirstName = useCallback(async (value: string) => {
    const clean = cleanFirstName(value);
    const request = generation.current;
    const saved = await updateConflictFirstName(clean);
    if (request === generation.current && userId) setFirstName(saved);
    return saved;
  }, [userId]);

  const saveAlias = useCallback(async (value: string) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (clean.length < 3 || clean.length > 40 || /[<>\u0000-\u001F\u007F]/.test(clean)) {
      throw new Error('Enter a leaderboard name between 3 and 40 characters.');
    }
    const request = generation.current;
    const saved = await updateConflictAlias(clean);
    if (request === generation.current && userId) setAlias(saved);
    return saved;
  }, [userId]);

  return { alias, firstName, loading, error, refresh, saveFirstName, saveAlias };
}
