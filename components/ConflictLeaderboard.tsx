import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';
import { getConflictLeaderboard } from '@/lib/conflictRewards';
import {
  CONFLICT_MILESTONES,
  summarizeConflictRewards,
  type ConflictLeaderboardEntry,
} from '@/lib/conflictRewardsCore';
import { useConflictIdentity } from '@/lib/useConflictIdentity';
import { GoldButton, OutlineButton } from '@/components/ui';

export function ConflictLeaderboard({ active }: { active: boolean }) {
  const { session, signInGoogle } = useAuth();
  const { progress } = useConflictJourney();
  const userId = session?.user.id;
  const identity = useConflictIdentity(userId);
  const rewards = summarizeConflictRewards(progress.completed);
  const [entries, setEntries] = useState<ConflictLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [aliasDraft, setAliasDraft] = useState('');
  const [savingAlias, setSavingAlias] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(true);
  const request = useRef(0);
  const lastTap = useRef(0);
  const longPressFired = useRef(false);
  const lastAliasTap = useRef(0);
  const aliasLongPressFired = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || !active) return;
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const rows = await getConflictLeaderboard();
      if (id === request.current) setEntries(rows);
    } catch (caught) {
      if (id === request.current) setError(caught instanceof Error ? caught.message : 'The leaderboard is unavailable right now.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [active, userId]);

  useFocusEffect(useCallback(() => {
    if (active) void refresh();
    return () => { request.current += 1; };
  }, [active, refresh]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && active) void refresh();
    });
    return () => subscription.remove();
  }, [active, refresh]);

  const openNameEditor = () => {
    if (!userId) return;
    setNameDraft(identity.firstName);
    setNameOpen(true);
  };

  const handleNamePress = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTap.current <= 450) {
      lastTap.current = 0;
      openNameEditor();
    } else {
      lastTap.current = now;
    }
  };

  const saveName = async () => {
    setSavingName(true);
    try {
      await identity.saveFirstName(nameDraft);
      setNameOpen(false);
    } catch (caught) {
      Alert.alert('Name not saved', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const openAliasEditor = () => {
    if (!userId || !identity.alias) return;
    setAliasDraft(identity.alias);
    setAliasOpen(true);
  };

  const handleAliasPress = () => {
    if (aliasLongPressFired.current) {
      aliasLongPressFired.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastAliasTap.current <= 450) {
      lastAliasTap.current = 0;
      openAliasEditor();
    } else {
      lastAliasTap.current = now;
    }
  };

  const saveAlias = async () => {
    setSavingAlias(true);
    try {
      await identity.saveAlias(aliasDraft);
      setAliasOpen(false);
      await refresh();
    } catch (caught) {
      Alert.alert('Name not saved', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingAlias(false);
    }
  };

  const nextLabel = rewards.nextMilestone === null
    ? 'You completed the full journey.'
    : rewards.nextMilestone === 1
      ? 'Complete your first reading item to reach your first milestone.'
      : `${rewards.itemsUntilNextMilestone.toLocaleString()} reading items to the ${rewards.nextMilestone.toLocaleString()}-item milestone.`;

  return (
    <View style={styles.pageSection}>
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>JOURNEY POINTS</Text>
        <Text style={styles.heading}>Celebrate steady progress.</Text>
        <Text style={styles.body}>Each completed Scripture or companion-reading item earns 10 Journey Points.</Text>
      </View>

      <View style={styles.pointsCard}>
        {userId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Welcome, ${identity.firstName}. Double-tap or hold to change your name.`}
            delayLongPress={1400}
            onLongPress={() => { longPressFired.current = true; openNameEditor(); }}
            onPress={handleNamePress}
          >
            <Text style={styles.welcome}>Welcome, {identity.firstName}!</Text>
          </Pressable>
        ) : <Text style={styles.welcome}>Welcome, Friend!</Text>}
        <Text style={styles.eyebrow}>YOUR JOURNEY POINTS</Text>
        <Text style={styles.points}>{rewards.journeyPoints.toLocaleString()}</Text>
        <Text style={styles.body}>{rewards.completedItems.toLocaleString()} of 1,696 reading items complete</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(rewards.nextMilestoneProgress * 100, 100))}%` }]} /></View>
        <Text style={styles.small}>{nextLabel}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.eyebrow}>MILESTONES</Text>
        <Text style={styles.panelTitle}>Markers along the way</Text>
        {CONFLICT_MILESTONES.map((milestone) => (
          <View key={milestone} style={styles.milestone}>
            <Text style={[styles.milestoneMark, rewards.completedItems >= milestone && styles.earned]}>{rewards.completedItems >= milestone ? '✓' : '◇'}</Text>
            <Text style={styles.milestoneText}>{milestone === 1696 ? 'Journey complete' : milestone === 1 ? '1 reading item' : `${milestone.toLocaleString()} reading items`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: leaderboardOpen }}
          accessibilityLabel={`${leaderboardOpen ? 'Close' : 'Open'} Journey leaderboard`}
          onPress={() => setLeaderboardOpen((open) => !open)}
          style={styles.leaderboardToggle}
        >
          <View style={styles.leaderboardTitleCopy}><Text style={styles.eyebrow}>ALL READERS</Text><Text style={[styles.panelTitle, styles.leaderboardTitle]}>Journey leaderboard</Text></View>
          <Text style={styles.toggleMark}>{leaderboardOpen ? '−' : '+'}</Text>
        </Pressable>
        {leaderboardOpen && (!userId ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sign in to view the leaderboard.</Text>
            <Text style={styles.body}>Your local progress remains available without an account.</Text>
            <GoldButton title="Sign in to join" onPress={() => void signInGoogle()} />
          </View>
        ) : loading && !entries.length ? (
          <View style={styles.loading}><ActivityIndicator color={colors.gold} size="large" /><Text style={styles.body}>Gathering the community…</Text></View>
        ) : error ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Leaderboard unavailable</Text><Text style={styles.body}>{error}</Text><OutlineButton title="Try again" onPress={() => void refresh()} /></View>
        ) : !entries.length ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>The journey is just beginning.</Text><Text style={styles.body}>Complete a reading item and return here to see the community.</Text></View>
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <View key={`${entry.rank}:${entry.alias}`} style={[styles.row, entry.isCurrentUser && styles.currentRow]}>
                <Text style={styles.rank}>#{entry.rank}</Text>
                <View style={styles.identity}>
                  <View style={styles.aliasLine}>{entry.isCurrentUser ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.alias}. Change name.`}
                      delayLongPress={1400}
                      onLongPress={() => { aliasLongPressFired.current = true; openAliasEditor(); }}
                      onPress={handleAliasPress}
                      style={styles.aliasEdit}
                    >
                      <Text numberOfLines={2} style={styles.alias}>{entry.alias}</Text>
                      <Text style={styles.aliasHint}>Change name</Text>
                    </Pressable>
                  ) : <Text numberOfLines={2} style={styles.alias}>{entry.alias}</Text>}
                    {entry.isCurrentUser ? <Text style={styles.you}>YOU</Text> : null}</View>
                </View>
                <View style={styles.score}>
                  <Text style={styles.scoreMain}>{entry.journeyPoints.toLocaleString()} JP</Text>
                  <Text style={styles.scoreSmall}>{entry.completedItems.toLocaleString()} items</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      <Modal visible={nameOpen} transparent animationType="fade" onRequestClose={() => setNameOpen(false)}>
        <View style={styles.modalScrim}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close name editor" onPress={() => setNameOpen(false)} style={styles.modalBackdrop} />
          <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Your welcome name</Text>
              <Text style={styles.body}>This welcome name is private. Only your chosen leaderboard name appears publicly.</Text>
              <TextInput
                accessibilityLabel="First name"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                onChangeText={setNameDraft}
                selectTextOnFocus
                style={styles.input}
                value={nameDraft}
              />
              <View style={styles.modalActions}>
                <Pressable disabled={savingName} onPress={() => setNameOpen(false)} style={styles.modalButton}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
                <Pressable disabled={savingName} onPress={() => void saveName()} style={[styles.modalButton, styles.modalSave]}><Text style={styles.modalSaveText}>{savingName ? 'Saving…' : 'Save'}</Text></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <Modal visible={aliasOpen} transparent animationType="fade" onRequestClose={() => setAliasOpen(false)}>
        <View style={styles.modalScrim}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close leaderboard name editor" onPress={() => setAliasOpen(false)} style={styles.modalBackdrop} />
          <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Your leaderboard name</Text>
              <Text style={styles.body}>This name is public and appears on both Journey leaderboards. Your account details remain private.</Text>
              <TextInput accessibilityLabel="Leaderboard name" autoCapitalize="words" autoCorrect={false} maxLength={40} onChangeText={setAliasDraft} selectTextOnFocus style={styles.input} value={aliasDraft} />
              <View style={styles.modalActions}>
                <Pressable disabled={savingAlias} onPress={() => setAliasOpen(false)} style={styles.modalButton}><Text style={styles.modalCancel}>Cancel</Text></Pressable>
                <Pressable disabled={savingAlias} onPress={() => void saveAlias()} style={[styles.modalButton, styles.modalSave]}><Text style={styles.modalSaveText}>{savingAlias ? 'Saving…' : 'Save'}</Text></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageSection: { gap: 20 },
  headingBlock: { gap: 7 },
  eyebrow: { color: colors.gold, fontSize: 15, lineHeight: 21, letterSpacing: 1.4, fontWeight: '900', marginTop: 4 },
  heading: { color: colors.ivory, fontSize: 31, lineHeight: 38, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 18, lineHeight: 27 },
  pointsCard: { borderRadius: radius.lg, padding: 22, backgroundColor: colors.tealDeep, borderWidth: 1, borderColor: colors.gold, gap: 8 },
  welcome: { color: colors.ivory, fontSize: 25, lineHeight: 31, fontWeight: '900', textDecorationLine: 'underline', textDecorationColor: colors.gold },
  points: { color: colors.ivory, fontSize: 52, lineHeight: 59, fontWeight: '900', marginVertical: 2 },
  track: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(1,12,24,0.5)', marginTop: 10 },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.gold },
  small: { color: colors.ivory, fontSize: 15, lineHeight: 22, marginTop: 3 },
  panel: { borderRadius: radius.lg, padding: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  panelTitle: { color: colors.ivory, fontSize: 25, lineHeight: 31, fontWeight: '900', marginBottom: 14 },
  leaderboardToggle: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  leaderboardTitleCopy: { flex: 1 },
  leaderboardTitle: { marginBottom: 0 },
  toggleMark: { color: colors.gold, fontSize: 34, lineHeight: 38, fontWeight: '700' },
  milestone: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.border },
  milestoneMark: { color: colors.muted, fontSize: 25, width: 28 },
  earned: { color: colors.green },
  milestoneText: { flex: 1, color: colors.ivory, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  empty: { gap: 15, paddingVertical: 10 },
  emptyTitle: { color: colors.ivory, fontSize: 20, lineHeight: 27, fontWeight: '900' },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 15 },
  rows: { gap: 10 },
  row: { minHeight: 84, borderRadius: radius.md, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.panel2, borderWidth: 1, borderColor: 'transparent' },
  currentRow: { borderColor: colors.gold, backgroundColor: colors.tealDeep },
  rank: { color: colors.gold, fontSize: 18, fontWeight: '900', minWidth: 38 },
  identity: { flex: 1, minWidth: 0 },
  aliasLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  alias: { color: colors.ivory, flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  aliasEdit: { flexShrink: 1 },
  aliasHint: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  you: { color: colors.navy, backgroundColor: colors.gold, fontSize: 10, lineHeight: 17, paddingHorizontal: 6, borderRadius: 7, fontWeight: '900' },
  score: { alignItems: 'flex-end' },
  scoreMain: { color: colors.ivory, fontSize: 16, lineHeight: 22, fontWeight: '900' },
  scoreSmall: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.76)' },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  modalCenter: { flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.gold, padding: 21, gap: 13 },
  modalTitle: { color: colors.ivory, fontSize: 27, lineHeight: 33, fontWeight: '900' },
  input: { minHeight: 58, borderRadius: radius.sm, backgroundColor: colors.paper, color: '#1A2026', paddingHorizontal: 15, fontSize: 20, borderWidth: 2, borderColor: colors.gold },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalButton: { minHeight: 50, minWidth: 100, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  modalSave: { backgroundColor: colors.gold },
  modalCancel: { color: colors.ivory, fontSize: 17, fontWeight: '900' },
  modalSaveText: { color: colors.navy, fontSize: 17, fontWeight: '900' },
});
