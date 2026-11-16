import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Save } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { db } from '../db/db';
import type { Exercise, WorkoutSet, WorkoutSession } from '../types';
import { useSettingsStore } from '../store/settingsStore';

interface Props {
  exerciseId: string;
  onBack: () => void;
}

export function ExerciseDetailPage({ exerciseId, onBack }: Props) {
  const { unit } = useSettingsStore();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [notes, setNotes] = useState('');
  const [historySets, setHistorySets] = useState<WorkoutSet[]>([]);
  const [chartData, setChartData] = useState<{ date: string; maxWeight: number; est1RM: number }[]>([]);
  const [best1RM, setBest1RM] = useState<number>(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    db.exercises.get(exerciseId).then((ex: Exercise | undefined) => {
      if (ex) {
        setExercise(ex);
        setNotes(ex.notes || '');
      }
    });

    async function loadHistory() {
      const sets: WorkoutSet[] = await db.sets
        .where('exerciseId')
        .equals(exerciseId)
        .filter((s: WorkoutSet) => s.completed && s.type !== 'warmup')
        .toArray();

      if (!sets.length) return;

      const sessionMap = new Map<string, WorkoutSet[]>();
      for (const s of sets) {
        if (!sessionMap.has(s.sessionId)) sessionMap.set(s.sessionId, []);
        sessionMap.get(s.sessionId)!.push(s);
      }

      const sessions: WorkoutSession[] = await db.workoutSessions
        .where('id')
        .anyOf(Array.from(sessionMap.keys()))
        .toArray();

      sessions.sort((a: WorkoutSession, b: WorkoutSession) => a.startedAt - b.startedAt);

      let highest1RM = 0;
      const points: { date: string; maxWeight: number; est1RM: number }[] = [];

      for (const sess of sessions) {
        const sSets = sessionMap.get(sess.id) || [];
        const maxW = Math.max(0, ...sSets.map((s: WorkoutSet) => s.weight));
        const sessionBest1RM = Math.max(
          0,
          ...sSets.map((s: WorkoutSet) => s.weight * (1 + s.reps / 30))
        );
        if (sessionBest1RM > highest1RM) highest1RM = sessionBest1RM;

        points.push({
          date: new Date(sess.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          maxWeight: Math.round(maxW),
          est1RM: Math.round(sessionBest1RM),
        });
      }

      setHistorySets(sets.slice(-15).reverse());
      setChartData(points.slice(-10));
      setBest1RM(Math.round(highest1RM));
    }

    loadHistory();
  }, [exerciseId]);

  const handleSaveNotes = async () => {
    await db.exercises.update(exerciseId, { notes });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!exercise) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#7C7C87' }}>
        Loading exercise…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80, backgroundColor: '#000000' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#141416',
          borderBottom: '1px solid #232327',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#A1A1AA',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#FAFAFA', flex: 1 }}>
          {exercise.name}
        </h2>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Info card */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #232327',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: '#232327',
                color: '#2F8CFF',
              }}
            >
              {exercise.category}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: '#232327',
                color: '#2FD67B',
              }}
            >
              {exercise.trackingType}
            </span>
          </div>

          <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 4 }}>
            <strong style={{ color: '#FAFAFA' }}>Primary:</strong> {exercise.primaryMuscles.join(', ')}
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div style={{ fontSize: 13, color: '#7C7C87' }}>
              <strong style={{ color: '#A1A1AA' }}>Secondary:</strong> {exercise.secondaryMuscles.join(', ')}
            </div>
          )}

          {/* 1RM PR Badge */}
          {best1RM > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} color="#F59E0B" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>
                  Estimated 1RM PR
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FAFAFA' }}>
                {best1RM} {unit}
              </div>
            </div>
          )}
        </div>

        {/* 1RM & Weight Progression Chart */}
        {chartData.length > 1 && (
          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 16,
              padding: 16,
              border: '1px solid #232327',
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
              Progression Trend ({unit})
            </h3>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232327" />
                  <XAxis dataKey="date" stroke="#7C7C87" fontSize={11} />
                  <YAxis stroke="#7C7C87" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141416', borderColor: '#232327', color: '#FAFAFA' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="est1RM"
                    name="Est 1RM"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    name="Max Weight"
                    stroke="#2F8CFF"
                    strokeWidth={2}
                    dot={{ fill: '#2F8CFF', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Persistent Notes */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #232327',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
              Pinned Exercise Notes
            </h3>
            <button
              onClick={handleSaveNotes}
              style={{
                backgroundColor: isSaved ? '#2FD67B' : '#232327',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#FAFAFA',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Save size={13} /> {isSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Seat height, barbell grip width, cues (e.g. pause 2s at bottom)…"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#000000',
              border: '1px solid #232327',
              borderRadius: 8,
              color: '#FAFAFA',
              fontSize: 13,
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        {/* Recent Sets Log */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #232327',
          }}
        >
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
            Recent Sets History
          </h3>

          {historySets.length === 0 ? (
            <div style={{ color: '#7C7C87', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
              No completed sets recorded for this exercise yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {historySets.map((s: WorkoutSet) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: '#000000',
                    borderRadius: 8,
                    border: '1px solid #232327',
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: '#A1A1AA' }}>
                    {new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • Set {s.setNumber} ({s.type})
                  </span>
                  <span style={{ fontWeight: 700, color: '#2F8CFF' }}>
                    {s.weight} {unit} × {s.reps} reps
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
