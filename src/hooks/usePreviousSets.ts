import { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { WorkoutSet } from '../types';

interface PreviousSetInfo {
  weight: number;
  reps: number;
  setNumber: number;
}

export function usePreviousSets(exerciseId: string | null): PreviousSetInfo[] {
  const [prevSets, setPrevSets] = useState<PreviousSetInfo[]>([]);

  useEffect(() => {
    if (!exerciseId) {
      setPrevSets([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Find the most recent completed session that has sets for this exercise
        const setsForExercise: WorkoutSet[] = await db.sets
          .where('exerciseId')
          .equals(exerciseId!)
          .filter((s) => s.completed)
          .toArray();

        if (!setsForExercise.length || cancelled) return;

        // Group by sessionId, find the most recent
        const sessionMap = new Map<string, WorkoutSet[]>();
        for (const s of setsForExercise) {
          if (!sessionMap.has(s.sessionId)) sessionMap.set(s.sessionId, []);
          sessionMap.get(s.sessionId)!.push(s);
        }

        // Get session timestamps to find the most recent
        const sessionIds = Array.from(sessionMap.keys());
        const sessions = await db.workoutSessions
          .where('id')
          .anyOf(sessionIds)
          .toArray();

        if (!sessions.length || cancelled) return;

        const latestSession = sessions.reduce((best, s) =>
          s.startedAt > best.startedAt ? s : best
        );

        const latestSets = sessionMap
          .get(latestSession.id)!
          .filter((s) => s.type !== 'warmup')
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({ weight: s.weight, reps: s.reps, setNumber: s.setNumber }));

        if (!cancelled) setPrevSets(latestSets);
      } catch {
        // DB not ready yet
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exerciseId]);

  return prevSets;
}
