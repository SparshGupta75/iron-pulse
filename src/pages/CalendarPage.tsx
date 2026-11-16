import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { dayKey } from '../utils/format';
import { BackBar } from '../components/ui';
import { WorkoutCard } from '../components/WorkoutCard';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarPage() {
  const history = useHistory();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    history.sessions.forEach((s) => m.set(dayKey(s.startedAt), (m.get(dayKey(s.startedAt)) ?? 0) + 1));
    return m;
  }, [history.sessions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = dayKey(Date.now());
  const monthSessions = history.sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d.getFullYear() === year && d.getMonth() === month && (!selected || dayKey(s.startedAt) === selected);
  });
  const monthCount = history.sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
  const shift = (n: number) => (setCursor(new Date(year, month + n, 1)), setSelected(null));

  return (
    <>
      <BackBar title="Calendar" />
      <div className="scroll pad" style={{ paddingTop: 14, paddingBottom: 32 }}>
        <section className="card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft size={22} />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
              <div className="dim" style={{ fontSize: 13 }}>
                {monthCount} workout{monthCount === 1 ? '' : 's'}
              </div>
            </div>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight size={22} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {DAYS.map((d, i) => (
              <div key={i} className="dim" style={{ fontSize: 12, fontWeight: 650, padding: '4px 0' }}>
                {d}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const key = dayKey(new Date(year, month, i + 1));
              const on = byDay.has(key);
              const sel = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => on && setSelected(sel ? null : key)}
                  className="num"
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: key === today && !on ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                    background: on ? 'var(--accent)' : 'transparent',
                    outline: sel ? '2px solid #fff' : undefined,
                    outlineOffset: 1,
                    color: on ? '#fff' : 'var(--text-2)',
                    fontSize: 14.5,
                    fontWeight: on ? 700 : 500,
                    cursor: on ? 'pointer' : 'default',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {monthSessions.length === 0 ? (
            <p className="dim" style={{ textAlign: 'center', margin: '28px 0', fontSize: 15 }}>
              No workouts this month
            </p>
          ) : (
            monthSessions.map((s) => <WorkoutCard key={s.id} session={s} history={history} />)
          )}
        </div>
      </div>
    </>
  );
}
