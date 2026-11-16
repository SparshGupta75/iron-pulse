import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Exercise, WorkoutSession, WorkoutSet } from '../types';
import { useNav } from '../store/navStore';
import { e1rm } from '../utils/format';

export interface HistoryData {
  loaded: boolean;
  /** Finished workouts, newest first. */
  sessions: WorkoutSession[];
  setsBySession: Map<string, WorkoutSet[]>;
  exercises: Map<string, Exercise>;
}

const EMPTY: HistoryData = { loaded: false, sessions: [], setsBySession: new Map(), exercises: new Map() };

/** All finished workouts with their sets, reloaded whenever the database changes. */
export function useHistory(): HistoryData {
  const version = useNav((s) => s.dataVersion);
  const [data, setData] = useState<HistoryData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    Promise.all([db.workoutSessions.toArray(), db.sets.toArray(), db.exercises.toArray()]).then(
      ([sessions, sets, exercises]) => {
        if (cancelled) return;
        const setsBySession = new Map<string, WorkoutSet[]>();
        for (const s of sets) {
          const list = setsBySession.get(s.sessionId);
          if (list) list.push(s);
          else setsBySession.set(s.sessionId, [s]);
        }
        setData({
          loaded: true,
          sessions: sessions.sort((a, b) => b.startedAt - a.startedAt),
          setsBySession,
          exercises: new Map(exercises.map((e) => [e.id, e])),
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  return data;
}

/** Group a session's sets by exercise, preserving the order they were performed in. */
export function groupByExercise(sets: WorkoutSet[], order?: string[]): { exerciseId: string; sets: WorkoutSet[] }[] {
  const map = new Map<string, WorkoutSet[]>();
  [...sets]
    .sort((a, b) => a.timestamp - b.timestamp || a.setNumber - b.setNumber)
    .forEach((s) => {
      const list = map.get(s.exerciseId);
      if (list) list.push(s);
      else map.set(s.exerciseId, [s]);
    });
  const groups = [...map.entries()].map(([exerciseId, list]) => ({
    exerciseId,
    sets: list.sort((a, b) => a.setNumber - b.setNumber),
  }));
  if (order?.length) {
    const pos = (id: string) => {
      const i = order.indexOf(id);
      return i < 0 ? order.length : i;
    };
    groups.sort((a, b) => pos(a.exerciseId) - pos(b.exerciseId));
  }
  return groups;
}

export interface Bests {
  hasHistory: boolean;
  maxWeight: number;
  max1RM: number;
}

/** Best weight and estimated 1RM ever logged per exercise (optionally ignoring one session). */
export async function loadBests(exerciseIds: string[], excludeSessionId?: string): Promise<Map<string, Bests>> {
  const out = new Map<string, Bests>();
  if (!exerciseIds.length) return out;
  const sets = await db.sets.where('exerciseId').anyOf(exerciseIds).toArray();
  for (const s of sets) {
    if (!s.completed || s.type === 'warmup' || s.sessionId === excludeSessionId) continue;
    const b = out.get(s.exerciseId) ?? { hasHistory: false, maxWeight: 0, max1RM: 0 };
    b.hasHistory = true;
    b.maxWeight = Math.max(b.maxWeight, s.weight);
    b.max1RM = Math.max(b.max1RM, e1rm(s.weight, s.reps));
    out.set(s.exerciseId, b);
  }
  return out;
}

/**
 * Sets that beat a previous best. At most one weight record and one 1RM record
 * per exercise, credited to the best set of the session.
 */
export function findRecords(sets: WorkoutSet[], bests: Map<string, Bests>): Map<string, string> {
  const out = new Map<string, string>();
  const done = sets.filter((s) => s.completed && s.type !== 'warmup' && s.weight > 0 && s.reps > 0);
  const byEx = new Map<string, WorkoutSet[]>();
  done.forEach((s) => byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s]));
  byEx.forEach((list, exerciseId) => {
    const b = bests.get(exerciseId);
    if (!b?.hasHistory) return;
    const heaviest = list.reduce((a, s) => (s.weight > a.weight ? s : a));
    if (heaviest.weight > b.maxWeight) out.set(heaviest.id, 'Heaviest weight');
    const strongest = list.reduce((a, s) => (e1rm(s.weight, s.reps) > e1rm(a.weight, a.reps) ? s : a));
    if (e1rm(strongest.weight, strongest.reps) > b.max1RM + 0.01 && !out.has(strongest.id))
      out.set(strongest.id, 'Best 1RM');
  });
  return out;
}
