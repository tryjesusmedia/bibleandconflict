import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';
import {
  CONFLICT_MILESTONES,
  summarizeConflictRewards,
} from '@/lib/conflictRewardsCore';
import { useConflictIdentity } from '@/lib/useConflictIdentity';
import { GoldButton } from '@/components/ui';
import { ConflictLeaderboardModal } from '@/components/ConflictLeaderboardModal';

export function ConflictLeaderboard({ active }: { active: boolean }) {
  const { session, signInGoogle } = useAuth();
  const { progress } = useConflictJourney();
  const userId = session?.user.id;
  const identity = useConflictIdentity(userId);
  const rewards = summarizeConflictRewards(progress.completed);
  const [nameOpen, setNameOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingAlias, setSavingAlias] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [signInBusy, setSignInBusy] = useState(false);
  const openNameEditor = () => {
    if (!userId || savingName) return;
    setNameDraft(identity.alias || '');
    setNameOpen(true);
  };

  const saveName = async () => {
    setSavingName(true);
    try {
      const clean = nameDraft.trim().replace(/\s+/g, ' ');
      if (clean.length < 3 || clean.length > 40 || /[<>\u0000-\u001F\u007F]/.test(clean)) throw new Error('Enter a public name between 3 and 40 characters.');
      await identity.saveAlias(clean);
      setNameOpen(false);
    } catch (caught) {
      Alert.alert('Name not saved', caught instanceof Error ? caught.message : 'Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const saveAlias = async (alias: string) => {
    setSavingAlias(true);
    try {
      return await identity.saveAlias(alias);
    } finally {
      setSavingAlias(false);
    }
  };

  const signIn = async () => {
    setSignInBusy(true);
    try {
      await signInGoogle();
    } catch {
      Alert.alert('Sign-in not completed', 'Please try signing in with Google again.');
    } finally {
      setSignInBusy(false);
    }
  };

  return (
    <View style={styles.pageSection}>
      <View style={styles.pointsCard}>
        {userId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your public name"
            onPress={openNameEditor}
          >
            <Text style={styles.welcome}>{identity.alias || 'Your public name'}</Text>
            <Text style={styles.changeName}>Change name</Text>
          </Pressable>
        ) : null}
        <View style={styles.pointsLabel}><Text style={styles.eyebrow}>YOUR JOURNEY POINTS</Text></View>
        <Text style={styles.points}>{rewards.journeyPoints.toLocaleString()}</Text>
        <Text style={styles.body}>{rewards.completedItems.toLocaleString()} of 1,696 reading items complete</Text>
      </View>

      <View style={styles.panel}>
        <GoldButton title="View leaderboard" onPress={() => setLeaderboardOpen(true)} />
      </View>
      <View style={styles.panel}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: milestonesOpen }} onPress={() => setMilestonesOpen(value => !value)} style={styles.milestoneToggle}><Text style={styles.panelTitle}>Milestones {milestonesOpen ? '−' : '+'}</Text></Pressable>
        {milestonesOpen ? CONFLICT_MILESTONES.map((milestone) => (
          <View key={milestone} style={styles.milestone}>
            <Text style={[styles.milestoneMark, rewards.completedItems >= milestone && styles.earned]}>{rewards.completedItems >= milestone ? '✓' : '◇'}</Text>
            <Text style={styles.milestoneText}>{milestone === 1696 ? 'Journey complete' : milestone === 1 ? '1 reading item' : `${milestone.toLocaleString()} reading items`}</Text>
          </View>
        )) : null}
      </View>

      {active && leaderboardOpen ? <ConflictLeaderboardModal
        key={userId ?? 'guest'}
        visible={active && leaderboardOpen}
        signedIn={Boolean(userId)}
        aliasSaving={savingAlias}
        signInBusy={signInBusy}
        onRequestClose={() => setLeaderboardOpen(false)}
        onSignIn={signIn}
        onSaveAlias={saveAlias}
      /> : null}

      <Modal visible={nameOpen} transparent animationType="fade" onRequestClose={() => setNameOpen(false)}>
        <View style={styles.modalScrim}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close name editor" onPress={() => setNameOpen(false)} style={styles.modalBackdrop} />
          <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCenter}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Your public name</Text>
              <Text style={styles.body}>This name appears publicly on the leaderboard.</Text>
              <TextInput
                accessibilityLabel="Public name"
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

    </View>
  );
}

const styles = StyleSheet.create({
  pageSection: { gap: 20 },
  headingBlock: { gap: 7 },
  eyebrow: { color: colors.gold, fontSize: 15, lineHeight: 21, letterSpacing: 1.4, fontWeight: '900', marginTop: 4 },
  heading: { color: colors.ivory, fontSize: 31, lineHeight: 38, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 18, lineHeight: 27 },
  pointsCard: { gap: 8 },
  pointsLabel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  pointsExplanation: { color: colors.ivory, fontSize: 16, lineHeight: 24 },
  welcome: { color: colors.ivory, fontSize: 24, lineHeight: 31, fontWeight: '900' },
  changeName: { color: colors.gold, fontSize: 18, lineHeight: 26, fontWeight: '800', paddingVertical: 12 },
  points: { color: colors.ivory, fontSize: 32, lineHeight: 40, fontWeight: '900', marginVertical: 2 },
  track: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(1,12,24,0.5)', marginTop: 10 },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.gold },
  small: { color: colors.ivory, fontSize: 15, lineHeight: 22, marginTop: 3 },
  panel: { gap: 12 },
  milestoneToggle: { minHeight: 48, justifyContent: 'center' },
  panelTitle: { color: colors.ivory, fontSize: 20, lineHeight: 27, fontWeight: '700' },
  milestone: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.border },
  milestoneMark: { color: colors.muted, fontSize: 25, width: 28 },
  earned: { color: colors.green },
  milestoneText: { flex: 1, color: colors.ivory, fontSize: 17, lineHeight: 23, fontWeight: '800' },
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
