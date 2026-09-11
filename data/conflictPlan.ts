import rawPlan from '@/data/conflictPlan.json';

export const CONFLICT_PLAN_ID = 'bible-conflict-ages-v1';
export const CONFLICT_PROGRESS_PLAN_ID = 'bible-conflict-ages-chapters-v1';
export const CONFLICT_READING_COUNT = 264;
export const CONFLICT_TASK_COUNT = 1696;

type RawProgressTask = {
  label: string;
  url: string;
  legacyProgressIndex?: number;
};

export type ConflictBibleTask = RawProgressTask & {
  reference: string;
  book: string;
  chapter: number;
  progressIndex: number;
};

export type ConflictCommentaryTask = RawProgressTask & {
  chapterNumber: number | null;
  title: string;
  paragraphId: number;
  progressIndex: number;
};

export type ConflictReading = {
  id: string;
  day: number;
  code: string;
  sourceKey: string;
  title: string;
  bibleReference: string;
  bibleUrl: string | null;
  bibleTasks: ConflictBibleTask[];
  commentaryBook: string;
  commentaryCode: string;
  commentaryCitation: string;
  commentaryPageStart: number | null;
  commentaryPageEnd: number | null;
  commentaryUrl: string | null;
  commentaryTasks: ConflictCommentaryTask[];
  reviewNote: string | null;
};

export type ConflictBook = {
  code: string;
  title: string;
  shortTitle: string;
  accent: string;
  readingCount: number;
};

export type ConflictPlan = {
  schemaVersion: number;
  planId: string;
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceHashes: Record<string, string>;
  books: ConflictBook[];
  reviewQueue: { id: string; day: number; reviewNote: string }[];
  readings: ConflictReading[];
  readingAliases: Record<string, string>;
};

type RawPlan = Omit<ConflictPlan, 'readings'> & {
  readings: (Omit<ConflictReading, 'bibleTasks' | 'commentaryTasks'> & {
    bibleTasks: Omit<ConflictBibleTask, 'progressIndex'>[];
    commentaryTasks: Omit<ConflictCommentaryTask, 'progressIndex'>[];
  })[];
};

function prepareConflictPlan(source: RawPlan): ConflictPlan {
  const taskCopies = source.readings.flatMap((reading) => [
    ...reading.bibleTasks.map((task) => ({ ...task })),
    ...reading.commentaryTasks.map((task) => ({ ...task })),
  ]);
  const reserved = new Set(taskCopies
    .map((task) => task.legacyProgressIndex)
    .filter((index): index is number => Number.isInteger(index) && Number(index) >= 0));
  let nextIndex = 0;
  let taskCursor = 0;

  const assignIndex = <T extends RawProgressTask>(task: T) => {
    const copy = taskCopies[taskCursor++];
    if (
      copy.label !== task.label
      || copy.url !== task.url
      || copy.legacyProgressIndex !== task.legacyProgressIndex
    ) throw new Error('Conflict plan task order changed while assigning progress.');

    let progressIndex = task.legacyProgressIndex;
    if (!Number.isInteger(progressIndex) || Number(progressIndex) < 0) {
      while (reserved.has(nextIndex)) nextIndex += 1;
      progressIndex = nextIndex;
      nextIndex += 1;
    }
    return { ...task, progressIndex: Number(progressIndex) };
  };

  const readings = source.readings.map((reading) => ({
    ...reading,
    bibleTasks: reading.bibleTasks.map(assignIndex),
    commentaryTasks: reading.commentaryTasks.map(assignIndex),
  })) as ConflictReading[];
  const assigned = readings.flatMap((reading) => [
    ...reading.bibleTasks.map((task) => task.progressIndex),
    ...reading.commentaryTasks.map((task) => task.progressIndex),
  ]).sort((left, right) => left - right);

  if (
    source.planId !== CONFLICT_PLAN_ID
    || readings.length !== CONFLICT_READING_COUNT
    || assigned.length !== CONFLICT_TASK_COUNT
    || assigned.some((index, expected) => index !== expected)
    || readings.some((reading, index) => reading.day !== index + 1)
    || new Set(readings.map((reading) => reading.id)).size !== readings.length
  ) throw new Error('The Bible and Conflict reading plan failed validation.');

  return { ...source, readings } as ConflictPlan;
}

export const conflictPlan = prepareConflictPlan(rawPlan as RawPlan);

export const conflictReadingById = new Map(conflictPlan.readings.map((reading) => [reading.id, reading]));

export function resolveConflictReadingId(readingId: string | null | undefined) {
  if (!readingId) return null;
  return conflictPlan.readingAliases[readingId] ?? readingId;
}

export function conflictReadingIndex(readingId: string | null | undefined) {
  const resolved = resolveConflictReadingId(readingId);
  return resolved ? conflictPlan.readings.findIndex((reading) => reading.id === resolved) : -1;
}

export function conflictReadingComplete(reading: ConflictReading, completed: ReadonlySet<number>) {
  const bibleComplete = !reading.bibleReference
    || (reading.bibleTasks.length > 0 && reading.bibleTasks.every((task) => completed.has(task.progressIndex)));
  const commentaryComplete = !reading.commentaryCitation
    || (reading.commentaryTasks.length > 0 && reading.commentaryTasks.every((task) => completed.has(task.progressIndex)));
  return bibleComplete && commentaryComplete;
}
