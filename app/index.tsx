import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMenu } from '@/components/AccountMenu';
import { ConflictLeaderboard } from '@/components/ConflictLeaderboard';
import { EarnedReadingBadges, ReadingBadgeButton } from '@/components/ReadingBadges';
import { GoldButton } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';
import { conflictPlan, conflictReadingComplete, conflictContinueIndex, type ConflictBook, type ConflictReading } from '@/data/conflictPlan';
import { summarizeConflictRewards } from '@/lib/conflictRewardsCore';

type ViewName = 'journey' | 'progress' | 'leaderboard';
const views: { name: ViewName; label: string }[] = [
  { name: 'journey', label: 'Readings' },
  { name: 'progress', label: 'Progress' },
  { name: 'leaderboard', label: 'Leaderboard' },
];

function completedReadings(readings: ConflictReading[], completed: ReadonlySet<number>) {
  return readings.filter(reading => conflictReadingComplete(reading, completed)).length;
}

function JourneyBook({ book, expanded, onToggle }: { book: ConflictBook; expanded: boolean; onToggle: () => void }) {
  const { completed, progress, setReading } = useConflictJourney();
  const readings = useMemo(() => conflictPlan.readings.filter(reading => reading.code === book.code), [book.code]);
  const complete = completedReadings(readings, completed);
  return (
    <View style={styles.book}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={({ pressed }) => [styles.bookHeader, pressed && styles.pressed]}>
        <View style={styles.bookCopy}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.muted}>{complete}/{readings.length} readings complete</Text>
        </View>
        <Text style={styles.expandMark}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? readings.map(reading => {
        const index = conflictPlan.readings.indexOf(reading);
        const complete = conflictReadingComplete(reading, completed);
        return (
          <View key={reading.id} style={[styles.readingRow, index === progress.lastIndex && styles.currentReading]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open reading ${reading.day}: ${reading.title}${complete ? ', complete' : ''}`} onPress={() => {
            setReading(index);
            router.push({ pathname: '/reading', params: { id: reading.id } });
          }} style={({ pressed }) => [styles.readingLink, pressed && styles.pressed]}>
            <View style={styles.bookCopy}>
              <Text style={styles.readingNumber}>READING {reading.day}</Text>
              <Text style={styles.readingTitle}>{reading.title}</Text>
              {complete ? <Text style={styles.completeText}>✓ Complete</Text> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {complete ? <ReadingBadgeButton reading={reading} /> : null}
          </View>
        );
      }) : null}
    </View>
  );
}

function JourneyView() {
  const { progress, completed, setReading } = useConflictJourney();
  const nextIndex = conflictContinueIndex(progress.lastIndex, completed);
  const next = conflictPlan.readings[nextIndex];
  const [expandedBook, setExpandedBook] = useState('');
  const started = completed.size > 0 || progress.lastIndex > 0;
  const finished = completedReadings(conflictPlan.readings, completed) === conflictPlan.readings.length;
  return (
    <View style={styles.section}>
      <View style={styles.start}>
        <GoldButton title={finished ? 'Read again' : started ? 'Continue reading' : 'Start reading'} onPress={() => {
          setReading(nextIndex);
          router.push({ pathname: '/reading', params: { id: next.id } });
        }} />
        <Text style={styles.nextReading}>Reading {next.day} · {next.title}</Text>
      </View>
      <Text style={styles.sectionTitle}>All readings</Text>
      <View>
        {conflictPlan.books.map(book => <JourneyBook key={book.code} book={book} expanded={expandedBook === book.code} onToggle={() => setExpandedBook(current => current === book.code ? '' : book.code)} />)}
      </View>
    </View>
  );
}

function ProgressView() {
  const { completed } = useConflictJourney();
  const count = completedReadings(conflictPlan.readings, completed);
  const rewards = summarizeConflictRewards([...completed]);
  return (
    <View style={styles.section}>
      <View style={styles.progressSummary}>
        <Text style={styles.progressNumber}>{count}/{conflictPlan.readings.length}</Text>
        <Text style={styles.muted}>Readings complete</Text>
        <Text style={styles.muted}>{rewards.journeyPoints.toLocaleString()} Journey Points</Text>
      </View>
      {conflictPlan.books.map(book => {
        const readings = conflictPlan.readings.filter(reading => reading.code === book.code);
        const count = completedReadings(readings, completed);
        return <View key={book.code} style={styles.progressRow}><Text style={styles.readingTitle}>{book.title}</Text><Text style={styles.muted}>{count}/{readings.length} readings complete</Text></View>;
      })}
      <EarnedReadingBadges />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready, error, refresh } = useConflictJourney();
  const [activeView, setActiveView] = useState<ViewName>('journey');
  useFocusEffect(React.useCallback(() => { if (ready) void refresh(true); }, [ready, refresh]));
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.gold} size="large" /></View>;
  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <View style={styles.bookCopy}><Text style={styles.brand}>Try Jesus Media</Text><Text style={styles.title}>Bible & Conflict of the Ages</Text></View>
        <AccountMenu />
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {views.map(view => <Pressable key={view.name} accessibilityRole="tab" accessibilityState={{ selected: activeView === view.name }} onPress={() => setActiveView(view.name)} style={[styles.tab, activeView === view.name && styles.tabActive]}>
          <Text style={[styles.tabText, activeView === view.name && styles.tabTextActive]}>{view.label}</Text>
        </Pressable>)}
      </View>
      <ScrollView key={activeView} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 32) }]} showsVerticalScrollIndicator={false}>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {activeView === 'journey' ? <JourneyView /> : null}
        {activeView === 'progress' ? <ProgressView /> : null}
        {activeView === 'leaderboard' ? <ConflictLeaderboard active /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  loading: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  title: { color: colors.ivory, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  bookCopy: { flex: 1, minWidth: 0 },
  content: { padding: 20, paddingBottom: 32 },
  section: { gap: 20 },
  start: { gap: 10 },
  nextReading: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  sectionTitle: { color: colors.ivory, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  book: { borderTopWidth: 1, borderTopColor: colors.border },
  bookHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  bookTitle: { color: colors.ivory, fontSize: 20, lineHeight: 27, fontWeight: '700', marginBottom: 4 },
  muted: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  expandMark: { color: colors.gold, fontSize: 28, width: 28, textAlign: 'center' },
  readingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.border },
  readingLink: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
  currentReading: { backgroundColor: colors.panel, borderRadius: radius.sm },
  readingNumber: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  readingTitle: { color: colors.ivory, fontSize: 18, lineHeight: 25, fontWeight: '800' },
  completeText: { color: colors.green, fontSize: 15, lineHeight: 22, marginTop: 3 },
  chevron: { color: colors.gold, fontSize: 28, width: 20, textAlign: 'center' },
  progressSummary: { gap: 5, paddingBottom: 8 },
  progressNumber: { color: colors.ivory, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  progressRow: { gap: 5, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, minWidth: 0, minHeight: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 4, paddingVertical: 12 },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.gold, fontSize: 16, lineHeight: 22, fontWeight: '800', textAlign: 'center' },
  tabTextActive: { color: colors.navy },
  error: { color: colors.ivory, backgroundColor: '#672B35', borderRadius: radius.sm, padding: 15, fontSize: 16, lineHeight: 23, marginBottom: 20 },
  pressed: { opacity: 0.72 },
});
