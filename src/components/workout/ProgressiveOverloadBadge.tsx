import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { db } from '../../db/db';
import type { WorkoutSet } from '../../types';

interface Props {
  exerciseId: string;
  repMaxTarget?: number;
  currentWeight?: number;
  onApplyDeload?: (newWeight: number) => void;
  onApplyWeight?: (newWeight: number) => void;
}

interface OverloadAdvice {
  type: 'level_up' | 'deload' | 'plateau' | 'progressing' | null;
  message: string;
  suggestedWeight?: number;
}

export function ProgressiveOverloadBadge({
  exerciseId,
  repMaxTarget = 10,
  currentWeight = 0,
  onApplyDeload,
  onApplyWeight,
}: Props) {
  const [advice, setAdvice] = useState<OverloadAdvice | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function evaluateProgression() {
      try {
        // Query last completed sets for this exercise
        const sets: WorkoutSet[] = await db.sets
          .where('exerciseId')
          .equals(exerciseId)
          .filter((s) => s.completed && s.type !== 'warmup')
          .toArray();

        if (sets.length === 0 || cancelled) return;

        // Group by session
        const sessionMap = new Map<string, WorkoutSet[]>();
        for (const s of sets) {
          if (!sessionMap.has(s.sessionId)) sessionMap.set(s.sessionId, []);
          sessionMap.get(s.sessionId)!.push(s);
        }

        const sessionIds = Array.from(sessionMap.keys());
        const sessions = await db.workoutSessions
          .where('id')
          .anyOf(sessionIds)
          .toArray();

        if (sessions.length === 0 || cancelled) return;

        // Sort sessions chronological ascending
        sessions.sort((a, b) => a.startedAt - b.startedAt);
        const recentSessions = sessions.slice(-3);

        if (recentSessions.length === 0) return;

        const sessionWorkloads = recentSessions.map((sess) => {
          const sSets = sessionMap.get(sess.id) || [];
          const maxWeight = Math.max(0, ...sSets.map((s) => s.weight));
          const avgReps = sSets.length > 0 ? sSets.reduce((sum, s) => sum + s.reps, 0) / sSets.length : 0;
          const allHitRepCap = sSets.length > 0 && sSets.every((s) => s.reps >= repMaxTarget);
          return { maxWeight, avgReps, allHitRepCap, sets: sSets };
        });

        const latest = sessionWorkloads[sessionWorkloads.length - 1];

        // Case 1: Hit target reps across all sets in recent session
        if (latest.allHitRepCap && latest.maxWeight > 0) {
          const nextWeight = latest.maxWeight + 2.5;
          setAdvice({
            type: 'level_up',
            message: `Ready to level up: Try ${nextWeight} kg (+2.5 kg) or aim for ${repMaxTarget + 2} reps!`,
            suggestedWeight: nextWeight,
          });
          return;
        }

        // Case 2: Plateau or stall over 3 consecutive sessions
        if (sessionWorkloads.length >= 3) {
          const [s1, s2, s3] = sessionWorkloads;
          const weightStalled = s1.maxWeight === s2.maxWeight && s2.maxWeight === s3.maxWeight;
          const repsStalled = Math.abs(s1.avgReps - s3.avgReps) < 1;

          if (weightStalled && repsStalled && s3.maxWeight > 20) {
            const deloadWeight = Math.round((s3.maxWeight * 0.85) / 2.5) * 2.5;
            setAdvice({
              type: 'deload',
              message: `Performance stalled 3 sessions. Recommended Deload: ${deloadWeight} kg (-15%) for recovery.`,
              suggestedWeight: deloadWeight,
            });
            return;
          }
        }

        // Case 3: Smooth progress
        if (currentWeight > 0 && latest.maxWeight > 0 && latest.maxWeight >= currentWeight) {
          setAdvice({
            type: 'progressing',
            message: `Previous best: ${latest.maxWeight} kg × ${Math.round(latest.avgReps)} reps`,
          });
        }
      } catch {
        // Dexie read fallback
      }
    }

    evaluateProgression();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, repMaxTarget, currentWeight]);

  if (!advice) return null;

  if (advice.type === 'level_up') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(47,214,123, 0.12)',
          border: '1px solid rgba(47,214,123, 0.3)',
          borderRadius: 8,
          padding: '8px 12px',
          margin: '6px 0 10px',
          fontSize: 12,
          color: '#2FD67B',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={15} style={{ flexShrink: 0 }} />
          <span>{advice.message}</span>
        </div>
        {advice.suggestedWeight && onApplyWeight && (
          <button
            onClick={() => onApplyWeight(advice.suggestedWeight!)}
            style={{
              backgroundColor: '#2FD67B',
              border: 'none',
              borderRadius: 6,
              color: '#FFFFFF',
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Apply {advice.suggestedWeight} kg
          </button>
        )}
      </div>
    );
  }

  if (advice.type === 'deload') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: '8px 12px',
          margin: '6px 0 10px',
          fontSize: 12,
          color: '#F59E0B',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{advice.message}</span>
        </div>
        {advice.suggestedWeight && onApplyDeload && (
          <button
            onClick={() => onApplyDeload(advice.suggestedWeight!)}
            style={{
              backgroundColor: '#F59E0B',
              border: 'none',
              borderRadius: 6,
              color: '#000000',
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Apply Deload
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        fontSize: 11,
        color: '#7C7C87',
        marginBottom: 6,
      }}
    >
      <Sparkles size={12} color="#2F8CFF" />
      <span>{advice.message}</span>
    </div>
  );
}
