import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  CONFLICT_READING_COUNT,
  conflictPlan,
  type ConflictReading,
} from '@/data/conflictPlan';
import { conflictLoadIdentity, isConflictLoadCurrent } from '@/lib/conflictProgressCore';
import {
  loadConflictProgress,
  prepareConflictDetach,
  removeConflictAccountLocal,
  saveConflictProgress,
  syncConflictReadingAggregate,
  type ConflictProgress,
} from '@/lib/conflictProgress';
import { supabase } from '@/lib/supabase';
import { createSerialTaskQueue, isLatestMutation } from '@/lib/serialMutationCore';

type SyncState = 'local' | 'syncing' | 'synced' | 'error';

type JourneyValue = {
  progress: ConflictProgress;
  completed: ReadonlySet<number>;
  ready: boolean;
  syncState: SyncState;
  error: string;
  refresh: (silent?: boolean) => Promise<void>;
  setReading: (index: number) => void;
  toggleTask: (reading: ConflictReading, progressIndex: number) => void;
  recordOpen: (reading: ConflictReading, kind: 'bible' | 'commentary') => void;
  disconnect: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const ConflictJourneyContext = createContext<JourneyValue | null>(null);

function failureMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Progress could not be synced right now. Your change remains saved on this device.';
}

export function ConflictJourneyProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading, signOut } = useAuth();
  const userId = session?.user.id;
  const [progress, setProgress] = useState<ConflictProgress>({ completed: [], lastIndex: 0, updatedAt: '' });
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const mutationSequence = useRef(0);
  const saveQueue = useRef(createSerialTaskQueue());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const refresh = useCallback(async (silent = false) => {
    if (authLoading) return;
    const request = ++generation.current;
    const identity = conflictLoadIdentity(userId);
    const mutation = mutationSequence.current;
    if (!silent) setReady(false);
    setSyncState(userId ? 'syncing' : 'local');
    setError('');
    const runLoad = async () => {
      const requestIsCurrent = () => (
        isConflictLoadCurrent(request, generation.current, identity, userId, authLoading)
        && isLatestMutation(mutation, mutationSequence.current)
      );
      if (!isConflictLoadCurrent(request, generation.current, identity, userId, authLoading)) return;
      try {
        const loaded = await loadConflictProgress(userId);
        if (!requestIsCurrent()) return;
        progressRef.current = loaded;
        setProgress(loaded);
        setSyncState(userId ? 'synced' : 'local');
      } catch (caught) {
        if (!requestIsCurrent()) return;
        setError(failureMessage(caught));
        setSyncState('error');
      } finally {
        if (requestIsCurrent()) setReady(true);
      }
    };
    // A foreground refresh (including the return from an external reading)
    // must observe all snapshots that were queued before it.
    await saveQueue.current.enqueue(runLoad);
  }, [authLoading, userId]);

  useEffect(() => {
    generation.current += 1;
    if (!authLoading) void refresh();
    return () => { generation.current += 1; };
  }, [authLoading, refresh, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && ready) void refresh(true);
    });
    return () => subscription.remove();
  }, [ready, refresh]);

  const persist = useCallback((next: ConflictProgress, reading?: ConflictReading) => {
    const currentUserId = userId;
    const request = generation.current;
    const mutation = ++mutationSequence.current;
    progressRef.current = next;
    setProgress(next);
    setSyncState(currentUserId ? 'syncing' : 'local');
    setError('');
    const runSave = async () => {
      try {
        const saved = await saveConflictProgress(next, currentUserId);
        if (currentUserId && reading) {
          await syncConflictReadingAggregate(currentUserId, reading, new Set(saved.completed));
        }
        if (
          request !== generation.current
          || currentUserId !== userId
          || !isLatestMutation(mutation, mutationSequence.current)
        ) return;
        progressRef.current = saved;
        setProgress(saved);
        setSyncState(currentUserId ? 'synced' : 'local');
      } catch (caught) {
        if (
          request !== generation.current
          || currentUserId !== userId
          || !isLatestMutation(mutation, mutationSequence.current)
        ) return;
        setSyncState('error');
        setError(failureMessage(caught));
      }
    };
    void saveQueue.current.enqueue(runSave);
  }, [userId]);

  const setReading = useCallback((index: number) => {
    const normalizedIndex = Math.max(0, Math.min(index, CONFLICT_READING_COUNT - 1));
    if (progressRef.current.lastIndex === normalizedIndex) return;
    persist({ ...progressRef.current, lastIndex: normalizedIndex, updatedAt: new Date().toISOString() });
  }, [persist]);

  const toggleTask = useCallback((reading: ConflictReading, progressIndex: number) => {
    const nextCompleted = new Set(progressRef.current.completed);
    if (nextCompleted.has(progressIndex)) nextCompleted.delete(progressIndex);
    else nextCompleted.add(progressIndex);
    persist({
      completed: [...nextCompleted].sort((left, right) => left - right),
      lastIndex: conflictPlan.readings.indexOf(reading),
      updatedAt: new Date().toISOString(),
    }, reading);
  }, [persist]);

  const recordOpen = useCallback((reading: ConflictReading, kind: 'bible' | 'commentary') => {
    if (!userId) return;
    const currentUserId = userId;
    const currentCompleted = new Set(progressRef.current.completed);
    void saveQueue.current.enqueue(async () => {
      await syncConflictReadingAggregate(currentUserId, reading, currentCompleted, kind);
    }).catch(() => undefined);
  }, [userId]);

  const disconnect = useCallback(async () => {
    if (!userId) return;
    setSyncState('syncing');
    await saveQueue.current.drain();
    const saved = await prepareConflictDetach(userId, true);
    await signOut();
    progressRef.current = saved;
    setProgress(saved);
    setSyncState('local');
  }, [signOut, userId]);

  const deleteAccount = useCallback(async () => {
    if (!userId) throw new Error('Sign in before deleting an account.');
    await saveQueue.current.drain();
    const saved = await prepareConflictDetach(userId, true);
    const { data, error: functionError } = await supabase.functions.invoke('delete-account', {
      body: { confirmation: true },
    });
    if (functionError) throw functionError;
    if (!data || data.deleted !== true) throw new Error('The account deletion service did not confirm deletion.');
    await removeConflictAccountLocal(userId);
    await signOut();
    progressRef.current = saved;
    setProgress(saved);
    setSyncState('local');
  }, [signOut, userId]);

  const completed = useMemo(() => new Set(progress.completed), [progress.completed]);
  const value = useMemo<JourneyValue>(() => ({
    progress,
    completed,
    ready,
    syncState,
    error,
    refresh,
    setReading,
    toggleTask,
    recordOpen,
    disconnect,
    deleteAccount,
  }), [completed, deleteAccount, disconnect, error, progress, ready, recordOpen, refresh, setReading, syncState, toggleTask]);

  return <ConflictJourneyContext.Provider value={value}>{children}</ConflictJourneyContext.Provider>;
}

export function useConflictJourney() {
  const value = useContext(ConflictJourneyContext);
  if (!value) throw new Error('useConflictJourney must be used inside ConflictJourneyProvider');
  return value;
}
