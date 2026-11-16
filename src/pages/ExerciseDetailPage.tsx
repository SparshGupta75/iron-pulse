import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Medal } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db/db';
import type { Exercise, WorkoutSession, WorkoutSet } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { useNav } from '../store/navStore';
import { e1rm, fmtNum, fmtSet, fmtTime, relDate } from '../utils/format';
import { ExerciseDemo } from '../components/ui';
import { ExerciseHowTo } from '../components/ExerciseHowTo';
import { EXERCISE_MEDIA } from '../db/exerciseMedia';

interface Props {
  exerciseId: string;
  onBack: () => void;
}

interface Entry {
  session: WorkoutSession;
  sets: WorkoutSet[];
}

interface Metric {
  key: string;
  label: string;
  /** Value for one workout. */
  of: (sets: WorkoutSet[]) => number;
  fmt: (v: number) => string;
}

const max = (xs: number[]) => (xs.length ? Math.max(...xs) : 0);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const RANGES = [
  { label: '3M', days: 92 },
  { label: '1Y', days: 366 },
  { label: 'All', days: Infinity },
];

export function ExerciseDetailPage({ exerciseId, onBack }: Props) {
  const unit = useSettingsStore((s) => s.unit);
  const { push, dataVersion } = useNav();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tab, setTab] = useState<'summary' | 'history' | 'howto'>('summary');
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const [range, setRange] = useState(RANGES[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ex = await db.exercises.get(exerciseId);
      const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
      const working = sets.filter((s) => s.completed && s.type !== 'warmup');
      const sessions = await db.workoutSessions.bulkGet([...new Set(working.map((s) => s.sessionId))]);
      if (cancelled) return;
      setExercise(ex ?? null);
      setNotes(ex?.notes ?? '');
      setEntries(
        sessions
          .filter((s): s is WorkoutSession => Boolean(s))
          .sort((a, b) => a.startedAt - b.startedAt)
          .map((session) => ({
            session,
            sets: working.filter((s) => s.sessionId === session.id).sort((a, b) => a.setNumber - b.setNumber),
          }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, dataVersion]);

  const kind = exercise?.trackingType ?? 'WeightReps';
  const hasWeight = entries.some((e) => e.sets.some((s) => s.weight > 0));

  const metrics: Metric[] = useMemo(() => {
    const w = (v: number) => `${fmtNum(v)} ${unit}`;
    if (kind === 'Time')
      return [
        { key: 'longest', label: 'Longest Time', of: (s) => max(s.map((x) => x.durationSec ?? 0)), fmt: fmtTime },
        { key: 'total', label: 'Total Time', of: (s) => sum(s.map((x) => x.durationSec ?? 0)), fmt: fmtTime },
      ];
    if (kind === 'Distance')
      return [
        { key: 'distance', label: 'Distance', of: (s) => sum(s.map((x) => x.distanceKm ?? 0)), fmt: (v) => `${fmtNum(v)} km` },
        { key: 'time', label: 'Time', of: (s) => sum(s.map((x) => x.durationSec ?? 0)), fmt: fmtTime },
      ];
    const reps: Metric[] = [
      { key: 'reps', label: 'Most Reps', of: (s) => max(s.map((x) => x.reps)), fmt: (v) => `${v} reps` },
      { key: 'totalReps', label: 'Total Reps', of: (s) => sum(s.map((x) => x.reps)), fmt: (v) => `${v} reps` },
    ];
    if (!hasWeight) return reps;
    return [
      { key: 'weight', label: 'Heaviest Weight', of: (s) => max(s.map((x) => x.weight)), fmt: w },
      { key: '1rm', label: 'One Rep Max', of: (s) => max(s.map((x) => e1rm(x.weight, x.reps))), fmt: w },
      { key: 'setVol', label: 'Best Set Volume', of: (s) => max(s.map((x) => x.weight * x.reps)), fmt: w },
      { key: 'volume', label: 'Session Volume', of: (s) => sum(s.map((x) => x.weight * x.reps)), fmt: w },
      ...reps.slice(1),
    ];
  }, [kind, hasWeight, unit]);

  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const cutoff = range.days === Infinity ? 0 : Date.now() - range.days * 86400000;
  const points = entries
    .filter((e) => e.session.startedAt >= cutoff)
    .map((e) => ({
      t: e.session.startedAt,
      label: new Date(e.session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: Math.round(metric.of(e.sets) * 100) / 100,
    }));
  const latest = points[points.length - 1];
  const first = points[0];
  const change = latest && first && points.length > 1 && first.value > 0 ? ((latest.value - first.value) / first.value) * 100 : null;

  // All-time records: best value of each metric, with the date it was set.
  const records = metrics
    .map((m) => {
      let best = 0;
      let when = 0;
      entries.forEach((e) => {
        const v = m.of(e.sets);
        if (v > best) {
          best = v;
          when = e.session.startedAt;
        }
      });
      return { m, best, when };
    })
    .filter((r) => r.best > 0 && !r.m.key.startsWith('total') && r.m.key !== 'time');

  // Best weight ever lifted for each rep count.
  const byReps = useMemo(() => {
    const best = new Map<number, number>();
    entries.forEach((e) =>
      e.sets.forEach((s) => {
        if (s.weight > 0 && s.reps > 0 && s.reps <= 15) best.set(s.reps, Math.max(best.get(s.reps) ?? 0, s.weight));
      })
    );
    return [...best.entries()].sort((a, b) => a[0] - b[0]);
  }, [entries]);

  const saveNotes = () => {
    if (exercise && notes !== (exercise.notes ?? '')) db.exercises.update(exerciseId, { notes });
  };

  if (!exercise) return <div className="topbar" style={{ paddingLeft: 4 }}><button className="icon-btn" onClick={onBack} aria-label="Back"><ChevronLeft size={26} /></button></div>;

  return (
    <div>
      <div className="topbar" style={{ position: 'sticky', top: 0, paddingLeft: 4, borderBottom: 0 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={26} />
        </button>
        <h1>{exercise.name}</h1>
      </div>
      <div className="pad" style={{ position: 'sticky', top: 52, zIndex: 4, background: 'var(--bg)', paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
        <div className="seg">
          {(
            [
              ['summary', 'Summary'],
              ['history', 'History'],
              ['howto', 'How to'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pad" style={{ paddingTop: 14, paddingBottom: 48, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        {tab === 'summary' && (
          <>
            <ExerciseDemo exerciseId={exerciseId} />
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>{exercise.name}</div>
              <div className="muted" style={{ fontSize: 14.5, marginTop: 3 }}>
                Primary: <span style={{ color: 'var(--text)' }}>{exercise.primaryMuscles.join(', ') || '—'}</span>
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <div className="dim" style={{ fontSize: 14, marginTop: 1 }}>
                  Secondary: {exercise.secondaryMuscles.join(', ')}
                </div>
              )}
            </div>

            <section className="card" style={{ padding: 16 }}>
              {points.length === 0 ? (
                <div className="dim" style={{ textAlign: 'center', padding: '26px 0', fontSize: 14.5 }}>
                  {entries.length ? 'No workouts in this period' : 'Log this exercise to see your progress here'}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="num" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
                      {metric.fmt(latest.value)}
                    </span>
                    <span className="dim" style={{ fontSize: 13.5 }}>
                      {latest.label}
                    </span>
                    {change !== null && Math.abs(change) >= 0.5 && (
                      <span className="num" style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 700, color: change > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {change > 0 ? '+' : ''}
                        {change.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={{ height: 170, margin: '12px -6px 4px -14px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="exFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2F8CFF" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#2F8CFF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#232327" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fill: '#7C7C87', fontSize: 11 }} />
                        <YAxis width={44} tickLine={false} axisLine={false} domain={['auto', 'auto']} tick={{ fill: '#7C7C87', fontSize: 11 }} tickFormatter={(v: number) => (kind === 'Time' || metric.key === 'time' ? fmtTime(v) : fmtNum(v))} />
                        <Tooltip
                          cursor={{ stroke: '#3a3a42' }}
                          contentStyle={{ background: '#1c1c20', border: '1px solid #2a2a30', borderRadius: 10, fontSize: 13 }}
                          labelStyle={{ color: '#a3a3ad' }}
                          formatter={(v) => [metric.fmt(Number(v)), metric.label]}
                        />
                        <Area type="monotone" dataKey="value" stroke="#2F8CFF" strokeWidth={2.5} fill="url(#exFill)" dot={points.length < 25 ? { r: 3, fill: '#2F8CFF', strokeWidth: 0 } : false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '10px -16px 0', padding: '0 16px' }}>
                {metrics.map((m) => (
                  <button key={m.key} className={`chip${metric.key === m.key ? ' on' : ''}`} onClick={() => setMetricKey(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="seg" style={{ marginTop: 12 }}>
                {RANGES.map((r) => (
                  <button key={r.label} className={range.label === r.label ? 'on' : ''} onClick={() => setRange(r)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </section>

            {records.length > 0 && (
              <section className="card" style={{ padding: '14px 16px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 750, marginBottom: 6 }}>
                  <Medal size={18} color="var(--yellow)" /> Personal Records
                </div>
                {records.map((r) => (
                  <div key={r.m.key} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15 }}>{r.m.label}</div>
                      <div className="dim" style={{ fontSize: 12.5 }}>
                        {new Date(r.when).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 750, color: 'var(--accent)' }}>
                      {r.m.fmt(Math.round(r.best * 100) / 100)}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {byReps.length > 1 && (
              <section className="card" style={{ padding: '14px 16px 8px' }}>
                <div style={{ fontSize: 16, fontWeight: 750, marginBottom: 8 }}>Best Weight by Reps</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20 }}>
                  {byReps.map(([reps, weight]) => (
                    <div key={reps} className="num" style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--line)', fontSize: 14.5 }}>
                      <span className="muted">
                        {reps} rep{reps > 1 ? 's' : ''}
                      </span>
                      <span style={{ fontWeight: 650 }}>
                        {fmtNum(weight)} {unit}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <p className="section-label" style={{ margin: '4px 2px 8px' }}>
                Notes
              </p>
              <textarea
                className="field"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Seat height, grip width, cues..."
              />
            </section>
          </>
        )}

        {tab === 'history' &&
          (entries.length === 0 ? (
            <p className="dim" style={{ textAlign: 'center', margin: '40px 0', fontSize: 15 }}>
              No history yet
            </p>
          ) : (
            [...entries].reverse().map(({ session, sets }) => (
              <article key={session.id} className="card tappable" style={{ padding: 14 }} onClick={() => push({ type: 'workout', id: session.id })}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{session.routineName || 'Workout'}</div>
                <div className="dim" style={{ fontSize: 13, marginBottom: 8 }}>
                  {relDate(session.startedAt)}
                </div>
                {sets.map((s, i) => (
                  <div key={s.id} className="num" style={{ display: 'flex', gap: 14, padding: '4px 0', fontSize: 15 }}>
                    <span className="dim" style={{ width: 16, fontWeight: 700 }}>
                      {s.type === 'failure' ? 'F' : s.type === 'dropset' ? 'D' : i + 1}
                    </span>
                    <span>{fmtSet(s, kind, unit)}</span>
                  </div>
                ))}
              </article>
            ))
          ))}

        {tab === 'howto' &&
          (EXERCISE_MEDIA[exerciseId] ? (
            <ExerciseHowTo exerciseId={exerciseId} defaultOpen />
          ) : (
            <p className="dim" style={{ textAlign: 'center', margin: '40px 0', fontSize: 15 }}>
              No instructions for this exercise
            </p>
          ))}
      </div>
    </div>
  );
}
