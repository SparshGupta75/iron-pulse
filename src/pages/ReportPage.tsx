import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Medal, TrendingDown, TrendingUp } from 'lucide-react';
import type { MuscleGroup, WorkoutSession } from '../types';
import { useHistory, type HistoryData } from '../hooks/useHistory';
import { useSettingsStore } from '../store/settingsStore';
import { useNav } from '../store/navStore';
import { dayKey, fmtDuration, fmtVolume, muscleColor, weekStart } from '../utils/format';
import { BackBar, ExerciseAvatar } from '../components/ui';

type Mode = 'week' | 'month';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** [start, end) of the week or month that is `offset` periods before the current one. */
function periodBounds(mode: Mode, offset: number): [number, number] {
  const now = new Date();
  if (mode === 'month') {
    return [new Date(now.getFullYear(), now.getMonth() - offset, 1).getTime(), new Date(now.getFullYear(), now.getMonth() - offset + 1, 1).getTime()];
  }
  const monday = new Date(weekStart(Date.now()));
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - offset * 7);
  return [start.getTime(), new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7).getTime()];
}

function summarize(sessions: WorkoutSession[], history: HistoryData) {
  const muscles = new Map<MuscleGroup, number>();
  const exercises = new Map<string, number>();
  let sets = 0;
  for (const s of sessions) {
    for (const set of history.setsBySession.get(s.id) ?? []) {
      if (set.type === 'warmup') continue;
      sets++;
      exercises.set(set.exerciseId, (exercises.get(set.exerciseId) ?? 0) + 1);
      history.exercises.get(set.exerciseId)?.primaryMuscles.forEach((m) => muscles.set(m, (muscles.get(m) ?? 0) + 1));
    }
  }
  return {
    workouts: sessions.length,
    duration: sessions.reduce((a, s) => a + ((s.finishedAt ?? s.startedAt) - s.startedAt), 0),
    volume: sessions.reduce((a, s) => a + s.totalVolume, 0),
    sets,
    records: sessions.reduce((a, s) => a + (s.prCount ?? 0), 0),
    days: new Set(sessions.map((s) => dayKey(s.startedAt))),
    muscles: [...muscles.entries()].sort((a, b) => b[1] - a[1]),
    exercises: [...exercises.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before || now === before) return null;
  const pct = ((now - before) / before) * 100;
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>
      <Icon size={13} /> {Math.abs(pct) >= 1000 ? '999+' : Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function ReportPage() {
  const history = useHistory();
  const unit = useSettingsStore((s) => s.unit);
  const push = useNav((s) => s.push);
  const [mode, setMode] = useState<Mode>('week');
  const [offset, setOffset] = useState(0);

  const [start, end] = periodBounds(mode, offset);
  const [prevStart, prevEnd] = periodBounds(mode, offset + 1);
  const cur = useMemo(
    () => summarize(history.sessions.filter((s) => s.startedAt >= start && s.startedAt < end), history),
    [history, start, end]
  );
  const prev = useMemo(
    () => summarize(history.sessions.filter((s) => s.startedAt >= prevStart && s.startedAt < prevEnd), history),
    [history, prevStart, prevEnd]
  );

  const title =
    mode === 'month'
      ? new Date(start).toLocaleDateString([], { month: 'long', year: 'numeric' })
      : `${new Date(start).toLocaleDateString([], { day: 'numeric', month: 'short' })} – ${new Date(end - 86400000).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
  const subtitle = offset === 0 ? (mode === 'week' ? 'This week' : 'This month') : offset === 1 ? (mode === 'week' ? 'Last week' : 'Last month') : '';
  const vsLabel = mode === 'week' ? 'vs previous week' : 'vs previous month';
  const topMuscle = Math.max(1, cur.muscles[0]?.[1] ?? 1);

  const tiles: { label: string; value: string; now: number; before: number }[] = [
    { label: 'Workouts', value: String(cur.workouts), now: cur.workouts, before: prev.workouts },
    { label: 'Time', value: fmtDuration(cur.duration), now: cur.duration, before: prev.duration },
    { label: 'Volume', value: fmtVolume(cur.volume, unit), now: cur.volume, before: prev.volume },
    { label: 'Sets', value: String(cur.sets), now: cur.sets, before: prev.sets },
  ];

  return (
    <>
      <BackBar title="Reports" />
      <div className="scroll pad" style={{ paddingTop: 14, paddingBottom: 40, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, alignContent: 'start' }}>
        <div className="seg">
          {(['week', 'month'] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => (setMode(m), setOffset(0))}>
              {m === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>

        <section className="card hero-glow" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="icon-btn" onClick={() => setOffset(offset + 1)} aria-label="Previous period">
              <ChevronLeft size={22} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.01em' }}>{title}</div>
              {subtitle && (
                <div className="muted" style={{ fontSize: 13 }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button className="icon-btn" disabled={offset === 0} style={{ opacity: offset === 0 ? 0.3 : 1 }} onClick={() => setOffset(Math.max(0, offset - 1))} aria-label="Next period">
              <ChevronRight size={22} />
            </button>
          </div>

          {mode === 'week' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 14 }}>
              {DAYS.map((d, i) => {
                const on = cur.days.has(dayKey(new Date(start + i * 86400000 + 43200000)));
                return (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ height: 10, borderRadius: 5, background: on ? 'var(--accent)' : 'rgba(255,255,255,0.08)' }} />
                    <div className="dim" style={{ marginTop: 5, fontSize: 11.5, fontWeight: 650 }}>
                      {d}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted" style={{ textAlign: 'center', marginTop: 10, fontSize: 14 }}>
              Trained on <strong style={{ color: 'var(--text)' }}>{cur.days.size}</strong> day{cur.days.size === 1 ? '' : 's'}
            </div>
          )}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tiles.map((t) => (
            <div key={t.label} className="card" style={{ padding: 14 }}>
              <div className="dim" style={{ fontSize: 13 }}>
                {t.label}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 4px' }}>
                {t.value}
              </div>
              <div style={{ minHeight: 17 }}>
                <Delta now={t.now} before={t.before} />
              </div>
            </div>
          ))}
        </section>
        <div className="dim" style={{ fontSize: 12.5, textAlign: 'center', marginTop: -6 }}>
          Arrows compare {vsLabel}
        </div>

        {cur.records > 0 && (
          <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'rgba(245,184,61,0.10)', borderColor: 'rgba(245,184,61,0.25)' }}>
            <Medal size={24} color="var(--yellow)" />
            <div style={{ fontSize: 15.5, fontWeight: 650 }}>
              {cur.records} personal record{cur.records > 1 ? 's' : ''} set
            </div>
          </section>
        )}

        {cur.workouts === 0 ? (
          <p className="dim" style={{ textAlign: 'center', margin: '24px 0', fontSize: 15 }}>
            No workouts in this period
          </p>
        ) : (
          <>
            <section className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 750, marginBottom: 10 }}>Muscles Trained</div>
              {cur.muscles.slice(0, 8).map(([m, n]) => (
                <div key={m} style={{ display: 'grid', gridTemplateColumns: '104px 1fr 44px', alignItems: 'center', gap: 10, height: 30, fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</span>
                  <span style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <i style={{ display: 'block', height: '100%', width: `${(n / topMuscle) * 100}%`, borderRadius: 4, background: muscleColor(m) }} />
                  </span>
                  <span className="num dim" style={{ textAlign: 'right' }}>
                    {n} sets
                  </span>
                </div>
              ))}
            </section>

            <section className="card" style={{ padding: '14px 16px 6px' }}>
              <div style={{ fontSize: 16, fontWeight: 750, marginBottom: 4 }}>Top Exercises</div>
              {cur.exercises.slice(0, 5).map(([id, n]) => {
                const ex = history.exercises.get(id);
                return (
                  <div key={id} className="tappable" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--line)' }} onClick={() => push({ type: 'exercise', id })}>
                    <ExerciseAvatar exercise={ex} size={38} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex?.name ?? 'Exercise'}</span>
                    <span className="num dim" style={{ fontSize: 14 }}>
                      {n} sets
                    </span>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </>
  );
}
