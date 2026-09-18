import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_URL,
  SUPPORT_EMAIL_URL,
  WEBSITE_URL,
} from '@/constants/links';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';

async function open(url: string) {
  const supported = await Linking.canOpenURL(url);
  if (!supported) throw new Error('That link cannot be opened on this device.');
  await Linking.openURL(url);
}

export function AccountMenu() {
  const insets = useSafeAreaInsets();
  const { session, signInGoogle } = useAuth();
  const { disconnect, deleteAccount, syncState } = useConflictJourney();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<'menu' | 'account'>('menu');

  const close = () => {
    setVisible(false);
    setSection('menu');
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      close();
    } catch (caught) {
      Alert.alert('Please try again', caught instanceof Error ? caught.message : 'That action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete My Account and Data?',
      'This permanently deletes your Bible and Conflict account and its synced data in this app and the Bible and Conflict website reader. It also deletes all Bible and Conflict reading progress, Journey Points, and other app data stored on this device. Your ChronBible and Try Jesus: The Journey account stays separate.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete My Account and Data', style: 'destructive', onPress: () => void run(deleteAccount) },
      ],
    );
  };

  const mainRows = [
    session
      ? { label: 'Sign out', action: () => run(disconnect) }
      : { label: 'Sign in with Google', action: () => run(signInGoogle) },
    { label: 'Account & privacy', action: async () => setSection('account') },
    { label: 'Open the website', action: () => run(() => open(WEBSITE_URL)) },
    { label: 'Contact support', action: () => run(() => open(SUPPORT_EMAIL_URL)) },
  ];
  const accountRows = [
    { label: 'Privacy policy', action: () => run(() => open(PRIVACY_URL)) },
    { label: 'Account deletion information', action: () => run(() => open(ACCOUNT_DELETION_URL)) },
  ];
  const rows = section === 'menu' ? mainRows : accountRows;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open account and app menu"
        onPress={() => { setSection('menu'); setVisible(true); }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>☰</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.scrim}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={close} style={styles.backdrop} />
          <View
            accessibilityRole="menu"
            style={[styles.sheet, { paddingTop: Math.max(insets.top + 14, 28), paddingBottom: Math.max(insets.bottom + 18, 28) }]}
          >
            <View style={styles.sheetHeader}>
              {section === 'account' ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back to Menu" onPress={() => setSection('menu')} style={styles.back}>
                  <Text style={styles.backText}>‹</Text>
                </Pressable>
              ) : null}
              <View style={styles.headingCopy}>
                <Text style={styles.heading}>{section === 'menu' ? 'Menu' : 'Account & privacy'}</Text>
                <Text numberOfLines={2} style={styles.account}>{session?.user.email ?? 'Reading without an account'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={close} style={styles.close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.dot, syncState === 'error' && styles.dotError]} />
              <Text style={styles.statusText}>{session ? (syncState === 'synced' ? 'Progress synced' : syncState === 'error' ? 'Sync needs attention' : 'Syncing progress…') : 'Progress saved on this device'}</Text>
            </View>
            {rows.map((row) => (
              <Pressable
                key={row.label}
                accessibilityRole="menuitem"
                disabled={busy}
                onPress={row.action}
                style={({ pressed }) => [styles.row, pressed && styles.pressed, busy && styles.disabled]}
              >
                <Text style={styles.rowText}>{row.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
            {section === 'account' && session ? (
              <Pressable accessibilityRole="menuitem" disabled={busy} onPress={confirmDelete} style={styles.deleteRow}>
                <Text style={styles.deleteText}>Delete My Account and Data</Text>
              </Pressable>
            ) : null}
            <Text style={styles.note}>{section === 'menu' ? 'Google sign-in is optional. It is used only to save and sync your journey.' : 'This account syncs only with Bible and Conflict. Sign in separately to use ChronBible or Try Jesus: The Journey.'}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  triggerText: { color: colors.gold, fontSize: 24, lineHeight: 28, fontWeight: '900' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { width: '88%', maxWidth: 410, height: '100%', backgroundColor: colors.navy2, paddingHorizontal: 20, borderLeftWidth: 1, borderLeftColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headingCopy: { flex: 1 },
  heading: { color: colors.ivory, fontSize: 32, lineHeight: 38, fontWeight: '900' },
  account: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.panel2 },
  closeText: { color: colors.ivory, fontSize: 34, lineHeight: 38 },
  back: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.panel2 },
  backText: { color: colors.gold, fontSize: 37, lineHeight: 40, marginTop: -4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  dotError: { backgroundColor: colors.red },
  statusText: { color: colors.muted, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  row: { minHeight: 61, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  rowText: { color: colors.ivory, flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  chevron: { color: colors.gold, fontSize: 30 },
  deleteRow: { minHeight: 61, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  deleteText: { color: colors.red, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 20, padding: 14, borderRadius: radius.sm, backgroundColor: colors.panel },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
