import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMenu } from '@/components/AccountMenu';
import { Card, Eyebrow } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';
import {
  conflictPlan,
  conflictReadingById,
  conflictReadingComplete,
  resolveConflictReadingId,
  type ConflictReading,
} from '@/data/conflictPlan';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function openExternal(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('This link is not supported on your device.');
    await Linking.openURL(url);
  } catch (caught) {
    Alert.alert('Link not opened', caught instanceof Error ? caught.message : 'Please try again.');
  }
}

function CompletionControl({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.completion, checked && styles.completionChecked, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}><Text style={styles.checkmark}>{checked ? '✓' : ''}</Text></View>
      <Text style={[styles.completionText, checked && styles.completionTextChecked]}>{checked ? 'Completed' : 'Mark complete'}</Text>
    </Pressable>
  );
}

function ScriptureTask({ reading, taskIndex }: { reading: ConflictReading; taskIndex: number }) {
  const { completed, toggleTask, recordOpen } = useConflictJourney();
  const task = reading.bibleTasks[taskIndex];
  const checked = completed.has(task.progressIndex);

  const readNative = () => {
    recordOpen(reading, 'bible');
    router.push({ pathname: '/bible-reader', params: { reference: task.reference, translation: 'KJV' } });
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.scriptureActions}>
        <Pressable accessibilityRole="button" onPress={readNative} style={({ pressed }) => [styles.nativeAction, pressed && styles.pressed]}>
          <Text style={styles.nativeReference}>{task.reference}</Text>
          <Text style={styles.nativeHint}>Read in the app · KJV or WEB</Text>
        </Pressable>
        <View style={styles.verticalDivider} />
        <Pressable
          accessibilityRole="link"
          onPress={() => { recordOpen(reading, 'bible'); void openExternal(task.url); }}
          style={({ pressed }) => [styles.externalAction, pressed && styles.pressed]}
        >
          <Text style={styles.externalActionText}>Read on BibleGateway</Text>
          <Text style={styles.externalMark}>↗</Text>
        </Pressable>
      </View>
      <CompletionControl checked={checked} label={`${checked ? 'Unmark' : 'Mark'} ${task.reference} complete`} onPress={() => toggleTask(reading, task.progressIndex)} />
    </View>
  );
}

function CompanionTask({ reading, taskIndex }: { reading: ConflictReading; taskIndex: number }) {
  const { completed, toggleTask, recordOpen } = useConflictJourney();
  const task = reading.commentaryTasks[taskIndex];
  const checked = completed.has(task.progressIndex);
  return (
    <View style={styles.taskCard}>
      <Pressable
        accessibilityRole="link"
        onPress={() => { recordOpen(reading, 'commentary'); void openExternal(task.url); }}
        style={({ pressed }) => [styles.companionLink, pressed && styles.pressed]}
      >
        <View style={styles.companionCopy}>
          <Text style={styles.companionTitle}>{task.title}</Text>
          <Text style={styles.companionSource}>Read on EGW Writings</Text>
        </View>
        <Text style={styles.externalMark}>↗</Text>
      </Pressable>
      <CompletionControl checked={checked} label={`${checked ? 'Unmark' : 'Mark'} ${task.title} complete`} onPress={() => toggleTask(reading, task.progressIndex)} />
    </View>
  );
}

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestedId = resolveConflictReadingId(firstParam(params.id));
  const reading = requestedId ? conflictReadingById.get(requestedId) : undefined;
  const { ready, completed, setReading } = useConflictJourney();
  const index = reading ? conflictPlan.readings.indexOf(reading) : -1;
  const allTasks = useMemo(() => reading ? [...reading.bibleTasks, ...reading.commentaryTasks] : [], [reading]);
  const done = allTasks.filter((task) => completed.has(task.progressIndex)).length;

  useEffect(() => {
    if (index >= 0) setReading(index);
  }, [index, setReading]);

  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.gold} size="large" /></View>;
  if (!reading || index < 0) {
    return (
      <View style={[styles.missing, { paddingTop: Math.max(insets.top + 20, 36) }]}>
        <Text style={styles.missingTitle}>This reading could not be found.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.returnButton}><Text style={styles.returnText}>Return to the journey</Text></Pressable>
      </View>
    );
  }

  const navigate = (target: number) => {
    const next = conflictPlan.readings[target];
    if (!next) return;
    setReading(target);
    router.replace({ pathname: '/reading', params: { id: next.id } });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Return to the journey" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerKicker}>READING {reading.day}</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>{reading.title}</Text>
        </View>
        <AccountMenu />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 44) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.readingHero}>
          <Eyebrow>{reading.commentaryBook}</Eyebrow>
          <Text style={styles.title}>{reading.title}</Text>
          <Text style={styles.reference}>{reading.bibleReference}</Text>
          <View style={styles.itemProgress}>
            <View style={styles.itemTrack}><View style={[styles.itemFill, { width: `${allTasks.length ? done / allTasks.length * 100 : 0}%` }]} /></View>
            <Text style={styles.itemProgressText}>{done} of {allTasks.length} items complete</Text>
          </View>
        </View>

        {reading.bibleTasks.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.step}>1</Text>
              <View style={styles.sectionHeadingCopy}><Text style={styles.sectionTitle}>Begin with Scripture</Text><Text style={styles.sectionBody}>Tap the passage to read it inside the app in KJV or WEB.</Text></View>
            </View>
            {reading.bibleTasks.map((_task, taskIndex) => <ScriptureTask key={_task.progressIndex} reading={reading} taskIndex={taskIndex} />)}
          </View>
        ) : null}

        {reading.commentaryTasks.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.step}>2</Text>
              <View style={styles.sectionHeadingCopy}><Text style={styles.sectionTitle}>Continue with the companion</Text><Text style={styles.sectionBody}>{reading.commentaryCitation}</Text></View>
            </View>
            {reading.commentaryTasks.map((_task, taskIndex) => <CompanionTask key={_task.progressIndex} reading={reading} taskIndex={taskIndex} />)}
          </View>
        ) : null}

        <Card style={styles.completeCard}>
          <Text style={styles.completeTitle}>{conflictReadingComplete(reading, completed) ? 'Reading complete ✓' : 'Complete each item when you finish.'}</Text>
          <Text style={styles.completeBody}>Your next unfinished place will stay available on this device. Sign in only if you want it synced.</Text>
        </Card>

        <View style={styles.navigation}>
          <Pressable accessibilityRole="button" disabled={index === 0} onPress={() => navigate(index - 1)} style={[styles.navButton, index === 0 && styles.disabled]}>
            <Text style={styles.navDirection}>‹ PREVIOUS</Text>
            <Text numberOfLines={2} style={styles.navTitle}>{conflictPlan.readings[index - 1]?.title ?? 'Beginning'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={index === conflictPlan.readings.length - 1} onPress={() => navigate(index + 1)} style={[styles.navButton, styles.nextButton, index === conflictPlan.readings.length - 1 && styles.disabled]}>
            <Text style={styles.navDirection}>NEXT ›</Text>
            <Text numberOfLines={2} style={styles.navTitle}>{conflictPlan.readings[index + 1]?.title ?? 'Journey complete'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  missing: { flex: 1, backgroundColor: colors.navy, paddingHorizontal: 24, gap: 22 },
  missingTitle: { color: colors.ivory, fontSize: 28, lineHeight: 35, fontWeight: '900' },
  returnButton: { minHeight: 55, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  returnText: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  header: { minHeight: 86, paddingHorizontal: 13, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.navy2, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 47, height: 47, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
  backText: { color: colors.gold, fontSize: 39, lineHeight: 41, fontWeight: '500', marginTop: -4 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerKicker: { color: colors.gold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, fontWeight: '900' },
  headerTitle: { color: colors.ivory, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 17, paddingTop: 25, gap: 28 },
  readingHero: { gap: 8 },
  title: { color: colors.ivory, fontSize: 34, lineHeight: 41, fontWeight: '900' },
  reference: { color: colors.gold, fontSize: 20, lineHeight: 27, fontWeight: '800' },
  itemProgress: { marginTop: 8, gap: 7 },
  itemTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.panel2 },
  itemFill: { height: '100%', backgroundColor: colors.green, borderRadius: 5 },
  itemProgressText: { color: colors.muted, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  section: { gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  step: { width: 39, height: 39, borderRadius: 20, color: colors.navy, backgroundColor: colors.gold, textAlign: 'center', textAlignVertical: 'center', fontSize: 19, lineHeight: 39, fontWeight: '900', overflow: 'hidden' },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { color: colors.ivory, fontSize: 25, lineHeight: 31, fontWeight: '900' },
  sectionBody: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 4 },
  taskCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  scriptureActions: { minHeight: 108, flexDirection: 'row', alignItems: 'stretch' },
  nativeAction: { flex: 1, minWidth: 0, justifyContent: 'center', padding: 15 },
  nativeReference: { color: colors.ivory, fontSize: 19, lineHeight: 25, fontWeight: '900' },
  nativeHint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  verticalDivider: { width: 1, backgroundColor: colors.border, marginVertical: 13 },
  externalAction: { width: '39%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, gap: 4 },
  externalActionText: { color: colors.gold, fontSize: 14, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  externalMark: { color: colors.gold, fontSize: 23, lineHeight: 27 },
  completion: { minHeight: 59, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15 },
  completionChecked: { backgroundColor: colors.tealDeep },
  checkbox: { width: 28, height: 28, borderRadius: 7, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.gold },
  checkmark: { color: colors.navy, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  completionText: { color: colors.ivory, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  completionTextChecked: { color: colors.ivory },
  companionLink: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  companionCopy: { flex: 1 },
  companionTitle: { color: colors.ivory, fontSize: 18, lineHeight: 25, fontWeight: '900' },
  companionSource: { color: colors.gold, fontSize: 14, lineHeight: 21, fontWeight: '800', marginTop: 4 },
  completeCard: { gap: 7 },
  completeTitle: { color: colors.ivory, fontSize: 21, lineHeight: 28, fontWeight: '900' },
  completeBody: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  navigation: { flexDirection: 'row', gap: 12 },
  navButton: { flex: 1, minHeight: 98, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, padding: 13, justifyContent: 'center' },
  nextButton: { alignItems: 'flex-end' },
  navDirection: { color: colors.gold, fontSize: 13, lineHeight: 19, letterSpacing: 1, fontWeight: '900' },
  navTitle: { color: colors.ivory, fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: 4 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
});
