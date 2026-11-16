import { db } from './db';
import { seedExercises } from './seedExercises';
import type { Routine, RoutineFolder } from '../types';

const STARTER_FOLDERS: RoutineFolder[] = [
  { id: 'f-ppl', name: 'Push / Pull / Legs' },
  { id: 'f-ul', name: 'Upper / Lower' },
];

const STARTER_ROUTINES: Routine[] = [
  {
    id: 'routine-push',
    name: 'Push Day',
    folderId: 'f-ppl',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    exercises: [
      { exerciseId: 'bb-bench-press', sets: 4, repMin: 6, repMax: 10, restSeconds: 120, notes: 'Arch upper back, retract scapula' },
      { exerciseId: 'bb-overhead-press', sets: 3, repMin: 8, repMax: 10, restSeconds: 90 },
      { exerciseId: 'db-incline-press', sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
      { exerciseId: 'db-lateral-raise', sets: 4, repMin: 12, repMax: 15, restSeconds: 60 },
      { exerciseId: 'cable-pushdown', sets: 3, repMin: 10, repMax: 15, restSeconds: 60 },
    ],
  },
  {
    id: 'routine-pull',
    name: 'Pull Day',
    folderId: 'f-ppl',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    exercises: [
      { exerciseId: 'bb-deadlift', sets: 3, repMin: 5, repMax: 5, restSeconds: 180, notes: 'Brace core before each rep' },
      { exerciseId: 'bb-row', sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
      { exerciseId: 'mach-lat-pulldown', sets: 3, repMin: 8, repMax: 12, restSeconds: 75 },
      { exerciseId: 'cable-face-pull', sets: 4, repMin: 12, repMax: 15, restSeconds: 60 },
      { exerciseId: 'db-curl', sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
    ],
  },
  {
    id: 'routine-legs',
    name: 'Legs & Abs',
    folderId: 'f-ppl',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    exercises: [
      { exerciseId: 'bb-back-squat', sets: 4, repMin: 6, repMax: 8, restSeconds: 150, notes: 'Deep squat below parallel' },
      { exerciseId: 'bb-romanian-deadlift', sets: 3, repMin: 8, repMax: 12, restSeconds: 90 },
      { exerciseId: 'mach-leg-press', sets: 3, repMin: 10, repMax: 15, restSeconds: 90 },
      { exerciseId: 'mach-seated-leg-curl', sets: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      { exerciseId: 'bw-plank', sets: 3, repMin: 60, repMax: 60, restSeconds: 60 },
    ],
  },
];

let ready: Promise<void> | null = null;

/** Seed the database once; safe to call repeatedly (React StrictMode calls it twice). */
export function initDb(): Promise<void> {
  ready ??= seed();
  return ready;
}

async function seed() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkPut(seedExercises);
  }

  const routinesCount = await db.routines.count();
  if (routinesCount === 0) {
    await db.routines.bulkPut(STARTER_ROUTINES);
  }

  // Earlier builds seeded two starter exercises under ids that don't exist.
  const RENAMED: Record<string, string> = { 'cb-pushdown': 'cable-pushdown', 'cb-face-pull': 'cable-face-pull' };
  await db.routines.toCollection().modify((r) => {
    r.exercises.forEach((e) => {
      if (RENAMED[e.exerciseId]) e.exerciseId = RENAMED[e.exerciseId];
    });
  });

  const savedFolders = await db.settings.get('routineFolders');
  if (!savedFolders) {
    await db.settings.put({ key: 'routineFolders', value: STARTER_FOLDERS });
  }

  const unit = await db.settings.get('unit');
  if (!unit) {
    await db.settings.bulkPut([
      { key: 'unit', value: 'kg' },
      { key: 'barbellWeight', value: 20 },
      { key: 'availablePlates', value: [25, 20, 15, 10, 5, 2.5, 1.25] },
      { key: 'theme', value: 'dark' },
    ]);
  }
}
