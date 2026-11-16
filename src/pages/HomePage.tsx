import { useState } from 'react';
import { Flame, Dumbbell, Activity } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { useNav } from '../store/navStore';
import { useSettingsStore } from '../store/settingsStore';
import { dayKey, fmtVolume, weekStart, weekStreak } from '../utils/format';
import { WorkoutCard } from '../components/WorkoutCard';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HomePage() {
  const history = useHistory();
  const setTab = useNav((s) => s.setTab);
  const unit = useSettingsStore((s) => s.unit);
  const { sessions } = history;
  const [limit, setLimit] = useState(20);

  const monday = weekStart(Date.now());
  const trained = new Set(sessions.map((s) => dayKey(s.startedAt)));
  const today = dayKey(Date.now());
  const thisWeek = sessions.filter((s) => s.startedAt >= monday);
  const streak = weekStreak(sessions.map((s) => s.startedAt));

  return (
    <div className="scroll">
      <header className="pad" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18, paddingBottom: 14 }}>
        <div
          className="avatar"
          style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(140deg,#5AA9FF,#1F6FE0)' }}
        >
          <Activity size={20} strokeWidth={2.6} />
        </div>
        <h1 className="page-title" style={{ flex: 1 }}>
          Home
        </h1>
        {streak > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 999,
              background: 'rgba(255,138,76,0.14)',
              color: '#FF8A4C',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <Flame size={16} fill="#FF8A4C" /> {streak} week{streak > 1 ? 's' : ''}
          </div>
        )}
      </header>

      <div className="pad" style={{ display: 'grid', gap: 14, paddingBottom: 28 }}>
        {/* This week */}
        <section className="card hero-glow" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                This week
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
                {thisWeek.length} workout{thisWeek.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="num muted" style={{ fontSize: 14, fontWeight: 600 }}>
              {fmtVolume(thisWeek.reduce((a, s) => a + s.totalVolume, 0), unit)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {DAYS.map((d, i) => {
              const key = dayKey(new Date(monday + i * 86400000 + 43200000));
              const on = trained.has(key);
              const isToday = key === today;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      height: 38,
                      borderRadius: 11,
                      display: 'grid',
                      placeItems: 'center',
                      background: on ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                      border: isToday && !on ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      boxShadow: on ? '0 6px 16px rgba(47,140,255,0.35)' : undefined,
                    }}
                  >
                    {on && <Dumbbell size={16} />}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 650, color: isToday ? 'var(--text)' : 'var(--text-3)' }}>
                    {d}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {history.loaded && sessions.length === 0 && (
          <section className="card" style={{ padding: '36px 22px', textAlign: 'center' }}>
            <div className="avatar" style={{ width: 68, height: 68, margin: '0 auto 16px', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Dumbbell size={30} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 750 }}>No workouts yet</div>
            <p className="dim" style={{ margin: '6px 0 20px', fontSize: 15, lineHeight: 1.45 }}>
              Log your first session and it will show up here.
            </p>
            <button className="btn primary" onClick={() => setTab('workout')}>
              Start a Workout
            </button>
          </section>
        )}

        {sessions.slice(0, limit).map((s) => (
          <WorkoutCard key={s.id} session={s} history={history} />
        ))}
        {sessions.length > limit && (
          <button className="btn block" onClick={() => setLimit(limit + 20)}>
            Show older workouts
          </button>
        )}
      </div>
    </div>
  );
}
