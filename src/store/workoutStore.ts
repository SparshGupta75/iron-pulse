import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutSession, WorkoutSet, SetType, RoutineExercise } from '../types';
import { sessionVolume, uid } from '../utils/format';

export interface ActiveExerciseInfo {
  exerciseId: string;
  supersetGroupId?: string;
  notes?: string;
  /** Rest after each set, seconds. 0 = timer off. */
  restSeconds: number;
  repMin?: number;
  repMax?: number;
}

interface WorkoutState {
  activeSession: WorkoutSession | null;
  activeExercises: ActiveExerciseInfo[];
  activeSets: WorkoutSet[];
  /** Wall-clock time the current rest ends; null when not resting. */
  restEndsAt: number | null;
  restDuration: number;
  restExerciseName?: string;
}

interface WorkoutActions {
  startSession: (
    routineId?: string,
    routineName?: string,
    routineExercises?: RoutineExercise[],
    defaultRest?: number
  ) => void;
  renameSession: (name: string) => void;
  setSessionNotes: (notes: string) => void;
  discardSession: () => void;
  addExercises: (exerciseIds: string[], defaultRest?: number) => void;
  removeExercise: (exerciseId: string) => void;
  moveExercise: (exerciseId: string, dir: -1 | 1) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (setId: string) => void;
  updateSet: (id: string, updates: Partial<WorkoutSet>) => void;
  /** Toggle completion. `fill` supplies weight/reps when the inputs were left empty. */
  toggleSet: (id: string, fill?: { weight?: number; reps?: number }, exerciseName?: string) => void;
  insertWarmupRamp: (exerciseId: string, targetWeight: number) => void;
  setSupersetGroup: (exerciseId: string, groupId?: string) => void;
  setExerciseNotes: (exerciseId: string, notes: string) => void;
  setExerciseRest: (exerciseId: string, seconds: number) => void;
  startRest: (seconds: number, exerciseName?: string) => void;
  skipRest: () => void;
  adjustRest: (seconds: number) => void;
}

export type WorkoutStore = WorkoutState & WorkoutActions;

const withVolume = (session: WorkoutSession | null, sets: WorkoutSet[]) =>
  session ? { ...session, totalVolume: sessionVolume(sets) } : null;

const blankSet = (sessionId: string, exerciseId: string, n: number, type: SetType = 'normal'): WorkoutSet => ({
  id: uid(),
  sessionId,
  exerciseId,
  setNumber: n,
  type,
  weight: 0,
  reps: 0,
  completed: false,
  timestamp: Date.now(),
});

/** Keep each exercise's sets contiguous and numbered 1..n. */
const renumber = (sets: WorkoutSet[], exerciseId: string): WorkoutSet[] => {
  let n = 0;
  return sets.map((s) => (s.exerciseId === exerciseId ? { ...s, setNumber: ++n } : s));
};

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      activeSession: null,
      activeExercises: [],
      activeSets: [],
      restEndsAt: null,
      restDuration: 90,
      restExerciseName: undefined,

      startSession: (routineId, routineName, routineExercises, defaultRest = 90) => {
        const sessionId = uid();
        const exercises: ActiveExerciseInfo[] = [];
        const sets: WorkoutSet[] = [];
        (routineExercises ?? []).forEach((re) => {
          if (exercises.some((e) => e.exerciseId === re.exerciseId)) return;
          exercises.push({
            exerciseId: re.exerciseId,
            notes: re.notes || '',
            restSeconds: re.restSeconds ?? defaultRest,
            repMin: re.repMin,
            repMax: re.repMax,
          });
          const count = Math.max(1, re.sets || 3);
          for (let i = 1; i <= count; i++) sets.push(blankSet(sessionId, re.exerciseId, i));
        });
        set({
          activeSession: {
            id: sessionId,
            routineId,
            routineName: routineName || defaultTitle(),
            startedAt: Date.now(),
            totalVolume: 0,
          },
          activeExercises: exercises,
          activeSets: sets,
          restEndsAt: null,
          restExerciseName: undefined,
        });
      },

      renameSession: (name) =>
        set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, routineName: name } } : s)),

      setSessionNotes: (notes) =>
        set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, notes } } : s)),

      discardSession: () =>
        set({ activeSession: null, activeExercises: [], activeSets: [], restEndsAt: null }),

      addExercises: (ids, defaultRest = 90) =>
        set((s) => {
          if (!s.activeSession) return s;
          const fresh = ids.filter((id) => !s.activeExercises.some((e) => e.exerciseId === id));
          if (!fresh.length) return s;
          const sessionId = s.activeSession.id;
          return {
            activeExercises: [
              ...s.activeExercises,
              ...fresh.map((exerciseId) => ({ exerciseId, notes: '', restSeconds: defaultRest })),
            ],
            activeSets: [
              ...s.activeSets,
              ...fresh.flatMap((id) => [1, 2, 3].map((n) => blankSet(sessionId, id, n))),
            ],
          };
        }),

      removeExercise: (exerciseId) =>
        set((s) => {
          const activeSets = s.activeSets.filter((x) => x.exerciseId !== exerciseId);
          return {
            activeExercises: s.activeExercises.filter((e) => e.exerciseId !== exerciseId),
            activeSets,
            activeSession: withVolume(s.activeSession, activeSets),
          };
        }),

      moveExercise: (exerciseId, dir) =>
        set((s) => {
          const list = [...s.activeExercises];
          const i = list.findIndex((e) => e.exerciseId === exerciseId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return s;
          [list[i], list[j]] = [list[j], list[i]];
          return { activeExercises: list };
        }),

      addSet: (exerciseId) =>
        set((s) => {
          if (!s.activeSession) return s;
          const mine = s.activeSets.filter((x) => x.exerciseId === exerciseId);
          const last = mine[mine.length - 1];
          const next: WorkoutSet = {
            ...blankSet(s.activeSession.id, exerciseId, mine.length + 1),
            weight: last?.weight ?? 0,
            reps: last?.reps ?? 0,
          };
          // Insert right after this exercise's last set so order stays stable.
          const idx = last ? s.activeSets.lastIndexOf(last) + 1 : s.activeSets.length;
          const activeSets = [...s.activeSets.slice(0, idx), next, ...s.activeSets.slice(idx)];
          return { activeSets };
        }),

      removeSet: (setId) =>
        set((s) => {
          const target = s.activeSets.find((x) => x.id === setId);
          if (!target) return s;
          const activeSets = renumber(
            s.activeSets.filter((x) => x.id !== setId),
            target.exerciseId
          );
          return { activeSets, activeSession: withVolume(s.activeSession, activeSets) };
        }),

      updateSet: (id, updates) =>
        set((s) => {
          const activeSets = s.activeSets.map((x) => (x.id === id ? { ...x, ...updates } : x));
          return { activeSets, activeSession: withVolume(s.activeSession, activeSets) };
        }),

      toggleSet: (id, fill, exerciseName) =>
        set((s) => {
          const target = s.activeSets.find((x) => x.id === id);
          if (!target) return s;
          const completing = !target.completed;
          const activeSets = s.activeSets.map((x) =>
            x.id === id
              ? {
                  ...x,
                  completed: completing,
                  weight: completing && !x.weight ? fill?.weight ?? 0 : x.weight,
                  reps: completing && !x.reps ? fill?.reps ?? 0 : x.reps,
                  timestamp: completing ? Date.now() : x.timestamp,
                }
              : x
          );
          const rest = s.activeExercises.find((e) => e.exerciseId === target.exerciseId)?.restSeconds ?? 0;
          const startRest = completing && rest > 0;
          return {
            activeSets,
            activeSession: withVolume(s.activeSession, activeSets),
            restEndsAt: startRest ? Date.now() + rest * 1000 : s.restEndsAt,
            restDuration: startRest ? rest : s.restDuration,
            restExerciseName: startRest ? exerciseName : s.restExerciseName,
          };
        }),

      insertWarmupRamp: (exerciseId, targetWeight) =>
        set((s) => {
          if (!s.activeSession) return s;
          const sessionId = s.activeSession.id;
          const target = Math.max(20, targetWeight);
          const round = (w: number) => Math.round(w / 2.5) * 2.5;
          const warmups: WorkoutSet[] = [
            [0.5, 8],
            [0.7, 5],
            [0.85, 2],
          ].map(([pct, reps], i) => ({
            ...blankSet(sessionId, exerciseId, i + 1, 'warmup'),
            weight: round(target * pct),
            reps,
          }));
          const firstIdx = s.activeSets.findIndex((x) => x.exerciseId === exerciseId);
          const idx = firstIdx < 0 ? s.activeSets.length : firstIdx;
          const merged = [...s.activeSets.slice(0, idx), ...warmups, ...s.activeSets.slice(idx)];
          return { activeSets: renumber(merged, exerciseId) };
        }),

      setSupersetGroup: (exerciseId, groupId) =>
        set((s) => ({
          activeExercises: s.activeExercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, supersetGroupId: groupId } : e
          ),
        })),

      setExerciseNotes: (exerciseId, notes) =>
        set((s) => ({
          activeExercises: s.activeExercises.map((e) => (e.exerciseId === exerciseId ? { ...e, notes } : e)),
        })),

      setExerciseRest: (exerciseId, seconds) =>
        set((s) => ({
          activeExercises: s.activeExercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, restSeconds: seconds } : e
          ),
        })),

      startRest: (seconds, exerciseName) =>
        set({ restEndsAt: Date.now() + seconds * 1000, restDuration: seconds, restExerciseName: exerciseName }),

      skipRest: () => set({ restEndsAt: null }),

      adjustRest: (seconds) =>
        set((s) =>
          s.restEndsAt
            ? {
                restEndsAt: Math.max(Date.now(), s.restEndsAt + seconds * 1000),
                restDuration: Math.max(1, s.restDuration + seconds),
              }
            : s
        ),
    }),
    { name: 'ironpulse-active-workout', version: 1 }
  )
);

function defaultTitle(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Night Workout';
  if (h < 12) return 'Morning Workout';
  if (h < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}
