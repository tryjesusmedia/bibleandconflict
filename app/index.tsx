import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMenu } from '@/components/AccountMenu';
import { ConflictLeaderboard } from '@/components/ConflictLeaderboard';
import { Card, Eyebrow, GoldButton } from '@/components/ui';
import { FAITHCRAFT_URL } from '@/constants/links';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictJourney } from '@/contexts/ConflictJourneyContext';
import {
  conflictPlan,
  conflictReadingComplete,
  type ConflictBook,
  type ConflictReading,
} from '@/data/conflictPlan';
import { summarizeConflictRewards } from '@/lib/conflictRewardsCore';

type ViewName = 'journey' | 'progress' | 'leaderboard';

function completedReadings(readings: ConflictReading[], completed: ReadonlySet<number>) {
  return readings.filter((reading) => conflictReadingComplete(reading, completed)).length;
}

function bestRun(completed: ReadonlySet<number>) {
  let current = 0;
  let best = 0;
  for (const reading of conflictPlan.readings) {
    if (conflictReadingComplete(reading, completed)) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  }
  return best;
}

function JourneyBook({
  book,
  expanded,
  onToggle,
}: {
  book: ConflictBook;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { completed, progress, setReading } = useConflictJourney();
  const readings = useMemo(() => conflictPlan.readings.filter((reading) => reading.code === book.code), [book.code]);
  const complete = completedReadings(readings, completed);

  const openReading = (reading: ConflictReading) => {
    const index = conflictPlan.readings.indexOf(reading);
    setReading(index);
    router.push({ pathname: '/reading', params: { id: reading.id } });
  };

  return (
    <View style={[styles.bookCard, { borderTopColor: book.accent }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.bookHeader, pressed && styles.pressed]}
      >
        <View style={styles.bookCopy}>
          <Text style={styles.bookCode}>{book.code}</Text>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookProgress}>{complete} complete</Text>
        </View>
        <Text style={styles.expandMark}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.readingList}>
          {readings.map((reading) => {
            const index = conflictPlan.readings.indexOf(reading);
            const isComplete = conflictReadingComplete(reading, completed);
            const isCurrent = index === progress.lastIndex;
            const allTasks = [...reading.bibleTasks, ...reading.commentaryTasks];
            const itemComplete = allTasks.filter((task) => completed.has(task.progressIndex)).length;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reading ${reading.day}: ${reading.title}`}
                key={reading.id}
                onPress={() => openReading(reading)}
                style={({ pressed }) => [styles.readingRow, isCurrent && styles.currentReading, pressed && styles.pressed]}
              >
                <View style={[styles.readingNumber, isComplete && styles.readingNumberComplete]}>
                  <Text style={[styles.readingNumberText, isComplete && styles.readingNumberTextComplete]}>{isComplete ? '✓' : reading.day}</Text>
                </View>
                <View style={styles.readingCopy}>
                  <Text style={styles.readingTitle}>{reading.title}</Text>
                  <Text style={styles.readingMeta}>{reading.bibleReference} · {itemComplete}/{allTasks.length} items</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function JourneyView() {
  const { progress, completed } = useConflictJourney();
  const currentReading = conflictPlan.readings[progress.lastIndex] ?? conflictPlan.readings[0];
  const [expandedBook, setExpandedBook] = useState(currentReading.code);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    setExpandedBook(currentReading.code);
    initialized.current = true;
  }, [currentReading.code]);

  return (
    <View style={styles.section}>
      <View style={styles.viewHeading}>
        <Eyebrow>YOUR READING JOURNEY</Eyebrow>
        <Text style={styles.viewTitle}>Journey</Text>
        <Text style={styles.viewDescription}>Begin with Scripture, then continue into the companion reading.</Text>
      </View>
      <Card style={styles.continueCard}>
        <Text style={styles.continueLabel}>CONTINUE YOUR JOURNEY</Text>
        <Text style={styles.continueTitle}>{currentReading.title}</Text>
        <Text style={styles.continueReference}>{currentReading.bibleReference}</Text>
        <GoldButton title="Open this reading" onPress={() => router.push({ pathname: '/reading', params: { id: currentReading.id } })} />
      </Card>
      <View style={styles.books}>
        {conflictPlan.books.map((book) => (
          <JourneyBook
            key={book.code}
            book={book}
            expanded={expandedBook === book.code}
            onToggle={() => setExpandedBook((current) => current === book.code ? '' : book.code)}
          />
        ))}
      </View>
      <Text style={styles.privateNote}>Your reading progress remains private. Only your chosen leaderboard name and reading totals appear publicly.</Text>
      <Text style={styles.srSummary}>{completed.size} reading items complete.</Text>
    </View>
  );
}

function ProgressView({ showLeaderboard }: { showLeaderboard: () => void }) {
  const { completed } = useConflictJourney();
  const readingsComplete = completedReadings(conflictPlan.readings, completed);
  const rewards = summarizeConflictRewards([...completed]);

  return (
    <View style={styles.section}>
      <View style={styles.viewHeading}>
        <Eyebrow>YOUR READING JOURNEY</Eyebrow>
        <Text style={styles.viewTitle}>Progress</Text>
        <Text style={styles.viewDescription}>See the progress you have made through Scripture and all five companion volumes.</Text>
      </View>
      <View style={styles.statGrid}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{Math.round((readingsComplete / conflictPlan.readings.length) * 100)}%</Text><Text style={styles.statLabel}>Journey complete</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{readingsComplete}</Text><Text style={styles.statLabel}>Complete readings</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{bestRun(completed)}</Text><Text style={styles.statLabel}>Best reading run</Text></View>
        <View style={[styles.statCard, styles.pointsStat]}><Text style={styles.statNumber}>{rewards.journeyPoints.toLocaleString()}</Text><Text style={styles.statLabel}>Journey Points</Text></View>
      </View>
      <Card>
        <Text style={styles.panelTitle}>By companion book</Text>
        {conflictPlan.books.map((book) => {
          const readings = conflictPlan.readings.filter((reading) => reading.code === book.code);
          const count = completedReadings(readings, completed);
          const percent = readings.length ? count / readings.length * 100 : 0;
          return (
            <View key={book.code} style={styles.bookProgressRow}>
              <View style={styles.bookProgressHeader}><Text style={styles.bookProgressName}>{book.shortTitle}</Text><Text style={styles.bookProgressCount}>{count}/{readings.length}</Text></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: book.accent }]} /></View>
            </View>
          );
        })}
        <Text style={styles.progressSummary}>{rewards.completedItems.toLocaleString()} Scripture and companion-reading items marked complete.</Text>
        <GoldButton title="View Journey leaderboard" onPress={showLeaderboard} />
      </Card>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, signInGoogle } = useAuth();
  const { ready, syncState, error, refresh } = useConflictJourney();
  const [activeView, setActiveView] = useState<ViewName>('journey');
  const [moreOpen, setMoreOpen] = useState(false);

  useFocusEffect(React.useCallback(() => {
    if (ready) void refresh(true);
  }, [ready, refresh]));

  if (!ready) {
    return <View style={styles.loadingPage}><ActivityIndicator color={colors.gold} size="large" /><Text style={styles.loadingText}>Preparing your journey…</Text></View>;
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 30, 44) }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 18) }]}>
          <View style={styles.brand}>
            <Image source={require('../assets/logo.png')} resizeMode="contain" style={styles.logo} />
            <View><Text style={styles.brandMain}>TRY JESUS</Text><Text style={styles.brandSmall}>MEDIA</Text></View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.syncText}>{session ? (syncState === 'synced' ? 'Synced' : syncState === 'error' ? 'Sync error' : 'Syncing…') : 'On this device'}</Text>
            <AccountMenu />
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>A SCRIPTURE-FIRST READING JOURNEY</Text>
          <Text style={styles.heroTitle}>The Bible <Text style={styles.heroAmp}>&</Text>{'\n'}Conflict of the Ages</Text>
          <Text style={styles.heroLead}><Text style={styles.heroLeadStrong}>Scripture always comes first.</Text> The Bible is the foundation, the authority, and the heart of every assignment. The Conflict of the Ages commentary never replaces the Word of God—it simply accompanies Scripture, adds historical and spiritual context, and helps you pause over truths you might otherwise pass too quickly.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreOpen }} onPress={() => setMoreOpen((value) => !value)} style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>Read more about this journey</Text><Text style={styles.readMoreMark}>{moreOpen ? '−' : '+'}</Text>
          </Pressable>
          {moreOpen ? (
            <View style={styles.moreContent}>
              <Text style={styles.moreParagraph}>This journey will take you through the <Text style={styles.moreStrong}>entire Bible</Text> alongside the complete five-volume Conflict of the Ages set: <Text style={styles.italic}>Patriarchs and Prophets</Text>, <Text style={styles.italic}>Prophets and Kings</Text>, <Text style={styles.italic}>The Desire of Ages</Text>, <Text style={styles.italic}>The Acts of the Apostles</Text>, and <Text style={styles.italic}>The Great Controversy</Text>.</Text>
              <Text style={styles.moreParagraph}>Imagine reaching the final reading having followed the great story from Creation to restoration—not as disconnected passages, but as one unfolding revelation of God’s love. Commit to the journey, take it at your own pace, and we believe you will be richly blessed by the time you spend in God’s Word. The blessing is not merely in finishing a plan; it is in meeting God in Scripture, reading after reading.</Text>
              <View style={styles.foundation}>
                <Text style={styles.foundationEyebrow}>THE UNSHAKABLE FOUNDATION</Text>
                <Text style={styles.foundationTitle}>Scripture always comes first.</Text>
                <Text style={styles.moreParagraph}>Every assignment begins with the Bible. The companion reading is there to illuminate the setting, draw attention to biblical themes, and send you back to Scripture with fresh eyes—not to stand above it.</Text>
                <Text style={styles.foundationEyebrow}>THE FIVE COMPANION VOLUMES</Text>
                {conflictPlan.books.map((book) => <Text key={book.code} style={styles.volume}>• {book.title}</Text>)}
              </View>
            </View>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatMain}>Entire</Text><Text style={styles.heroStatSmall}>Bible</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatMain}>5</Text><Text style={styles.heroStatSmall}>companion books</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatMain}>1</Text><Text style={styles.heroStatSmall}>unfolding story</Text></View>
          </View>
        </View>

        {!session ? (
          <Pressable accessibilityRole="button" onPress={() => void signInGoogle()} style={styles.guestBanner}>
            <Text style={styles.guestTitle}>Google sign-in is optional</Text>
            <Text style={styles.guestBody}>Sign in only when you want progress saved across devices. Tap here to sync.</Text>
          </Pressable>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text> : null}

        <View accessibilityRole="tablist" style={styles.tabs}>
          {(['journey', 'progress', 'leaderboard'] as ViewName[]).map((view, index) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeView === view }}
              key={view}
              onPress={() => setActiveView(view)}
              style={[styles.tab, activeView === view && styles.tabActive]}
            >
              <Text style={[styles.tabNumber, activeView === view && styles.tabTextActive]}>0{index + 1}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.tabText, activeView === view && styles.tabTextActive]}>{view === 'leaderboard' ? 'Leaderboard' : view[0].toUpperCase() + view.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.content}>
          {activeView === 'journey' ? <JourneyView /> : null}
          {activeView === 'progress' ? <ProgressView showLeaderboard={() => setActiveView('leaderboard')} /> : null}
          {activeView === 'leaderboard' ? <ConflictLeaderboard active /> : null}
        </View>

        <View style={styles.footer}>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(FAITHCRAFT_URL)}>
            <Text style={styles.footerLink}>Powered by FaithCraft.Agency</Text>
          </Pressable>
          <Text style={styles.footerText}>© 2026 Try Jesus Media</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  loadingPage: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: colors.ivory, fontSize: 20, lineHeight: 27, fontWeight: '800' },
  header: { minHeight: 82, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logo: { width: 48, height: 48 },
  brandMain: { color: colors.ivory, fontSize: 17, lineHeight: 19, letterSpacing: 1.1, fontWeight: '900' },
  brandSmall: { color: colors.gold, fontSize: 12, lineHeight: 15, letterSpacing: 3, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  hero: { paddingHorizontal: 20, paddingTop: 35, paddingBottom: 30, backgroundColor: colors.navy2 },
  heroEyebrow: { color: colors.gold, fontSize: 14, lineHeight: 21, letterSpacing: 1.7, fontWeight: '900' },
  heroTitle: { color: colors.ivory, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 44, lineHeight: 48, fontWeight: '700', marginTop: 12, marginBottom: 20 },
  heroAmp: { color: colors.gold, fontStyle: 'italic' },
  heroLead: { color: colors.muted, fontSize: 18, lineHeight: 29 },
  heroLeadStrong: { color: colors.ivory, fontWeight: '900' },
  readMoreButton: { minHeight: 59, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  readMoreText: { flex: 1, color: colors.ivory, fontSize: 18, lineHeight: 25, fontWeight: '900' },
  readMoreMark: { color: colors.gold, fontSize: 27 },
  moreContent: { paddingTop: 18, gap: 16 },
  moreParagraph: { color: colors.ivory, fontSize: 18, lineHeight: 29 },
  moreStrong: { fontWeight: '900' },
  italic: { fontStyle: 'italic' },
  foundation: { borderLeftWidth: 4, borderLeftColor: colors.gold, backgroundColor: colors.panel, padding: 18, gap: 12, borderRadius: radius.sm },
  foundationEyebrow: { color: colors.gold, fontSize: 14, lineHeight: 20, letterSpacing: 1.2, fontWeight: '900' },
  foundationTitle: { color: colors.ivory, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 29, lineHeight: 35, fontWeight: '700' },
  volume: { color: colors.ivory, fontSize: 17, lineHeight: 26 },
  heroStats: { flexDirection: 'row', marginTop: 25, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  heroStat: { flex: 1, minHeight: 77, alignItems: 'center', justifyContent: 'center', padding: 8, borderRightWidth: 1, borderRightColor: colors.border },
  heroStatMain: { color: colors.gold, fontSize: 21, lineHeight: 26, fontWeight: '900' },
  heroStatSmall: { color: colors.ivory, fontSize: 11, lineHeight: 16, textAlign: 'center', fontWeight: '700' },
  guestBanner: { marginHorizontal: 18, marginTop: 18, borderRadius: radius.md, backgroundColor: colors.tealDeep, padding: 17, borderWidth: 1, borderColor: colors.gold },
  guestTitle: { color: colors.ivory, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  guestBody: { color: colors.ivory, fontSize: 15, lineHeight: 22, marginTop: 4 },
  errorBanner: { color: colors.ivory, backgroundColor: '#672B35', borderRadius: radius.sm, margin: 18, marginBottom: 0, padding: 15, fontSize: 16, lineHeight: 23 },
  tabs: { flexDirection: 'row', marginTop: 22, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, minWidth: 0, minHeight: 70, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  tabActive: { borderBottomColor: colors.gold, backgroundColor: colors.panel },
  tabNumber: { color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '900' },
  tabText: { color: colors.muted, fontSize: 15, lineHeight: 21, fontWeight: '900' },
  tabTextActive: { color: colors.gold },
  content: { paddingHorizontal: 18, paddingTop: 30 },
  section: { gap: 20 },
  viewHeading: { gap: 5 },
  viewTitle: { color: colors.ivory, fontSize: 36, lineHeight: 42, fontWeight: '900' },
  viewDescription: { color: colors.muted, fontSize: 18, lineHeight: 28 },
  continueCard: { gap: 10 },
  continueLabel: { color: colors.gold, fontSize: 14, lineHeight: 20, letterSpacing: 1.3, fontWeight: '900' },
  continueTitle: { color: colors.ivory, fontSize: 25, lineHeight: 32, fontWeight: '900' },
  continueReference: { color: colors.muted, fontSize: 17, lineHeight: 24, marginBottom: 7 },
  books: { gap: 14 },
  bookCard: { backgroundColor: colors.panel, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderTopWidth: 5 },
  bookHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 104, padding: 18 },
  bookCopy: { flex: 1 },
  bookCode: { color: colors.gold, fontSize: 13, lineHeight: 19, letterSpacing: 1.4, fontWeight: '900' },
  bookTitle: { color: colors.ivory, fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 2 },
  bookProgress: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  expandMark: { color: colors.gold, fontSize: 33, lineHeight: 38, width: 38, textAlign: 'center' },
  readingList: { borderTopWidth: 1, borderTopColor: colors.border },
  readingRow: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  currentReading: { backgroundColor: colors.tealDeep },
  readingNumber: { width: 43, height: 43, borderRadius: 22, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  readingNumberComplete: { backgroundColor: colors.gold },
  readingNumberText: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  readingNumberTextComplete: { color: colors.navy },
  readingCopy: { flex: 1, minWidth: 0 },
  readingTitle: { color: colors.ivory, fontSize: 17, lineHeight: 23, fontWeight: '900' },
  readingMeta: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  rowChevron: { color: colors.gold, fontSize: 31 },
  privateNote: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', paddingHorizontal: 8 },
  srSummary: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 130, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 14 },
  pointsStat: { backgroundColor: colors.tealDeep, borderColor: colors.gold },
  statNumber: { color: colors.gold, fontSize: 32, lineHeight: 39, fontWeight: '900' },
  statLabel: { color: colors.ivory, fontSize: 15, lineHeight: 21, fontWeight: '800', textAlign: 'center' },
  panelTitle: { color: colors.ivory, fontSize: 25, lineHeight: 31, fontWeight: '900', marginBottom: 13 },
  bookProgressRow: { marginBottom: 18 },
  bookProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  bookProgressName: { color: colors.ivory, flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  bookProgressCount: { color: colors.gold, fontSize: 16, lineHeight: 23, fontWeight: '900' },
  progressTrack: { height: 11, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.panel2 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressSummary: { color: colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 8 },
  footer: { alignItems: 'center', gap: 9, paddingHorizontal: 20, paddingTop: 44 },
  footerLink: { color: colors.gold, fontSize: 17, lineHeight: 24, fontWeight: '900', textDecorationLine: 'underline' },
  footerText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.74 },
});
