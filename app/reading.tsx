import React, { useEffect, useMemo, useRef } from 'react';
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
import { GoldButton } from '@/components/ui';
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

const companionPageRangesByParagraphId: Record<number, string> = {
  33: '15–22',
  72: '25–34',
  120: '35–50',
  190: '51–60',
  234: '61–74',
  301: '75–86',
  361: '87–98',
  422: '99–108',
  461: '109–116',
  505: '119–128',
  544: '129–142',
  1237: '279–292',
  1297: '293–300',
  1332: '303–310',
  1371: '311–321',
  1417: '322–330',
  1458: '331–339',
  1495: '340–348',
  1548: '349–366',
};

function companionPageLabel(reading: ConflictReading, taskIndex: number) {
  const ranges = [...reading.commentaryCitation.matchAll(/\b(?:PP|PK|DA|AA|GC)\s+(\d+)(?:\s*[-–]\s*(\d+))?/giu)]
    .map((match) => match[2] ? `${match[1]}–${match[2]}` : match[1]);
  const task = reading.commentaryTasks[taskIndex];
  const range = ranges.length === reading.commentaryTasks.length
    ? ranges[taskIndex]
    : ranges[0] ?? companionPageRangesByParagraphId[task.paragraphId];
  return range ? ` · pp. ${range}` : '';
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
  return (
    <View style={styles.task}>
      <GoldButton title={'Read ' + task.reference} onPress={() => {
        recordOpen(reading, 'bible');
        router.push({ pathname: '/bible-reader', params: { reference: task.reference, translation: 'KJV' } });
      }} />
      <View style={styles.taskTools}>
        <CompletionControl checked={checked} label={(checked ? 'Unmark ' : 'Mark ') + task.reference + ' complete'} onPress={() => toggleTask(reading, task.progressIndex)} />
        <Pressable accessibilityRole="link" accessibilityLabel={'Read ' + task.reference + ' on BibleGateway'} onPress={() => { recordOpen(reading, 'bible'); void openExternal(task.url); }} style={styles.externalLink}>
          <Text style={styles.externalText}>BibleGateway ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompanionTask({ reading, taskIndex }: { reading: ConflictReading; taskIndex: number }) {
  const { completed, toggleTask, recordOpen } = useConflictJourney();
  const task = reading.commentaryTasks[taskIndex];
  const checked = completed.has(task.progressIndex);
  return (
    <View style={styles.task}>
      <Text style={styles.companionTitle}>{task.title}</Text>
      <Text style={styles.source}>EGW Writings{companionPageLabel(reading, taskIndex)}</Text>
      <GoldButton title="Read companion chapter ↗" onPress={() => { recordOpen(reading, 'commentary'); void openExternal(task.url); }} />
      <CompletionControl checked={checked} label={(checked ? 'Unmark ' : 'Mark ') + task.title + ' complete'} onPress={() => toggleTask(reading, task.progressIndex)} />
    </View>
  );
}

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const requestedId = resolveConflictReadingId(firstParam(params.id));
  const reading = requestedId ? conflictReadingById.get(requestedId) : undefined;
  const { ready, completed, setReading } = useConflictJourney();
  const index = reading ? conflictPlan.readings.indexOf(reading) : -1;
  const allTasks = useMemo(() => reading ? [...reading.bibleTasks, ...reading.commentaryTasks] : [], [reading]);
  const done = allTasks.filter(task => completed.has(task.progressIndex)).length;
  const readingComplete = reading ? conflictReadingComplete(reading, completed) : false;
  useEffect(() => {
    if (index >= 0) setReading(index);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [index, setReading]);
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.gold} size="large" /></View>;
  if (!reading || index < 0) return <View style={[styles.missing, { paddingTop: Math.max(insets.top + 20, 36) }]}><Text style={styles.title}>Reading not found</Text><GoldButton title="Back to readings" onPress={() => router.replace('/')} /></View>;

  const navigate = (target: number) => {
    const next = conflictPlan.readings[target];
    if (!next) return;
    setReading(target);
    router.replace({ pathname: '/reading', params: { id: next.id } });
  };
  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.back}><Text style={styles.backText}>‹ Readings</Text></Pressable>
        <Text style={styles.position}>{reading.day}/{conflictPlan.readings.length}</Text>
        <AccountMenu />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.source}>Reading {reading.day}</Text>
          <Text style={styles.title}>{reading.title}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.source, readingComplete && styles.finished]}>{readingComplete ? '✓ Reading complete' : done + '/' + allTasks.length + ' items complete'}</Text>
        </View>
        {reading.bibleTasks.length ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Bible</Text>
          {reading.bibleTasks.map((task, taskIndex) => <ScriptureTask key={task.progressIndex} reading={reading} taskIndex={taskIndex} />)}
        </View> : null}
        {reading.commentaryTasks.length ? <View style={styles.section}>
          <View style={styles.heading}><Text style={styles.sectionTitle}>{reading.bibleTasks.length ? '2.' : '1.'} Companion reading</Text><Text style={styles.source}>{reading.commentaryBook}</Text></View>
          {reading.commentaryTasks.map((task, taskIndex) => <CompanionTask key={task.progressIndex} reading={reading} taskIndex={taskIndex} />)}
        </View> : null}
      </ScrollView>
      <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous reading" accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => navigate(index - 1)} style={[styles.navButton, index === 0 && styles.disabled]}><Text style={styles.navText}>‹ Previous</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next reading" accessibilityState={{ disabled: index === conflictPlan.readings.length - 1 }} disabled={index === conflictPlan.readings.length - 1} onPress={() => navigate(index + 1)} style={[styles.navButton, styles.nextButton, index === conflictPlan.readings.length - 1 && styles.disabled]}><Text style={styles.nextText}>Next ›</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  missing: { flex: 1, backgroundColor: colors.navy, paddingHorizontal: 24, gap: 22 },
  header: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { minHeight: 48, justifyContent: 'center', paddingRight: 8 },
  backText: { color: colors.gold, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  position: { flex: 1, color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 32, gap: 28 },
  heading: { gap: 6 },
  title: { color: colors.ivory, fontSize: 26, lineHeight: 33, fontWeight: '700' },
  source: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  finished: { color: colors.green },
  section: { gap: 16 },
  sectionTitle: { color: colors.ivory, fontSize: 22, lineHeight: 29, fontWeight: '700' },
  task: { gap: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  taskTools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8 },
  externalLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  externalText: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  companionTitle: { color: colors.ivory, fontSize: 20, lineHeight: 27, fontWeight: '600' },
  completion: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 8 },
  completionChecked: { opacity: 1 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.muted, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.navy, fontSize: 18, lineHeight: 20, fontWeight: '700' },
  completionText: { color: colors.ivory, fontSize: 16, lineHeight: 23 },
  completionTextChecked: { color: colors.green },
  navigation: { flexDirection: 'row', gap: 12, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.navy2 },
  navButton: { flex: 1, minHeight: 54, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold },
  nextButton: { backgroundColor: colors.gold },
  navText: { color: colors.ivory, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  nextText: { color: colors.navy, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
});
