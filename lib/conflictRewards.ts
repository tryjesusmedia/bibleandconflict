import { supabase } from '@/lib/supabase';
import { normalizeConflictLeaderboard } from '@/lib/conflictRewardsCore';

function message(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}
function textValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value.length === 1) return textValue(value[0]);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.alias ?? record.first_name);
  }
  return '';
}

export async function ensureConflictAlias() {
  const { data, error } = await supabase.rpc('ensure_journey_profile');
  if (error) throw new Error(message(error, 'Your public alias is unavailable right now.'));
  const alias = textValue(data);
  if (!alias) throw new Error('Your public alias is unavailable right now.');
  return alias;
}

export async function updateConflictAlias(nextAlias: string) {
  const { data, error } = await supabase.rpc('update_journey_alias', { p_alias: nextAlias });
  if (error) throw new Error(message(error, 'Your leaderboard name could not be saved right now.'));
  const alias = textValue(data);
  if (!alias) throw new Error('Your leaderboard name could not be saved right now.');
  return alias;
}

export async function getConflictFirstName() {
  const { data, error } = await supabase.rpc('get_my_journey_first_name');
  if (error) throw new Error(message(error, 'Your welcome name is unavailable right now.'));
  return textValue(data) || 'Friend';
}

export async function updateConflictFirstName(firstName: string) {
  const { data, error } = await supabase.rpc('update_my_journey_first_name', { p_first_name: firstName });
  if (error) throw new Error(message(error, 'Your first name could not be saved.'));
  return textValue(data) || firstName;
}

export async function getConflictLeaderboard() {
  const { data, error } = await supabase.rpc('get_conflict_journey_leaderboard');
  if (error) throw new Error(message(error, 'The Journey leaderboard is unavailable right now.'));
  return normalizeConflictLeaderboard(data);
}
