import { useMemo, useState } from 'react';
import { Settings, ChartColumn, BookOpen, Ruler, CalendarDays, ChevronRight, Pencil } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts';
import { useHistory } from '../hooks/useHistory';
import { useNav, type Screen } from '../store/navStore';
import { useSettingsStore } from '../store/settingsStore';
import { fmtVolume, weekStart, weekStreak } from '../utils/format';
import { Sheet } from '../components/ui';

type Metric = 'duration' | 'volume' | 'reps';
const WEEKS = 12;

const DASHBOARD: { label: string; hint: string; icon: typeof Settings; color: string; screen: Screen }[] = [
  { label: 'Statistics', hint: 'Muscles & strength', icon: ChartColumn, color: '#2F8CFF', screen: { type: 'statistics' } },
  { label: 'Exercises', hint: 'Library & records', icon: BookOpen, color: '#B57BFF', screen: { type: 'exercises' } },
  { label: 'Measures', hint: 'Body & cardio', icon: Ruler, color: '#2FD67B', screen: { type: 'measures' } },
  { label: 'Calendar', hint: 'Training days', icon: CalendarDays, color: '#F5B83D', screen: { type: 'calendar' } },
];

export default function ProfilePage() {
  const { sessions, setsBySession } = useHistory();
  const push = useNav((s) => s.push);
  const { unit, profileName, setProfileName } = useSettingsStore();
  const [metric, setMetric] = useState<Metric>('duration');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profileName);

  const weeks = useMemo(() => {
    const first = weekStart(Date.now() - (WEEKS - 1) * 7 * 86400000);
    const rows = Array.from({ length: WEEKS }, (_, i) => {
      const d = new Date(first);
      d.setDate(d.getDate() + i * 7);
      return { start: d.getTime(), label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), duration: 0, volume: 0, reps: 0 };
    });
    const index = new Map(rows.map((r) => [r.start, r]));
    for (const s of sessions) {
      const row = index.get(weekStart(s.startedAt));
      if (!row) continue;
      row.duration += ((s.finishedAt ?? s.startedAt) - s.startedAt) / 3600000;
      row.volume += s.totalVolume;
      row.reps += (setsBySession.get(s.id) ?? []).reduce((a, x) => a + x.reps, 0);
    }
    return rows;
  }, [sessions, setsBySession]);

  const current = weeks[weeks.length - 1];
  const headline =
    metric === 'duration'
      ? current.duration >= 1
        ? `${current.duration.toFixed(1)} hours`
        : `${Math.round(current.duration * 60)} min`
      : metric === 'volume'
        ? fmtVolume(current.volume, unit)
        : `${current.reps.toLocaleString()} reps`;
  const hasData = weeks.some((w) => w[metric] > 0);
  const totalVolume = sessions.reduce((a, s) => a + s.totalVolume, 0);
  const streak = weekStreak(sessions.map((s) => s.startedAt));

  return (
    <div className="scroll">
      <header className="pad" style={{ display: 'flex', alignItems: 'center', paddingTop: 18, paddingBottom: 10, paddingRight: 8 }}>
        <h1 className="page-title" style={{ flex: 1 }}>
          Profile
        </h1>
        <button className="icon-btn" onClick={() => push({ type: 'settings' })} aria-label="Settings">
          <Settings size={23} />
        </button>
      </header>

      <div className="pad" style={{ display: 'grid', gap: 14, paddingBottom: 32 }}>
        <section style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 2px' }}>
          <div
            className="avatar"
            style={{ width: 76, height: 76, fontSize: 32, background: 'linear-gradient(140deg,#5AA9FF,#1F6FE0)', boxShadow: '0 12px 32px rgba(47,140,255,0.35)' }}
          >
            {(profileName.trim()[0] ?? 'A').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              onClick={() => (setDraft(profileName), setEditing(true))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, border: 0, background: 'none', padding: 0, color: 'var(--text)', fontSize: 22, fontWeight: 750, letterSpacing: '-0.02em', cursor: 'pointer' }}
            >
              {profileName} <Pencil size={15} color="var(--text-3)" />
            </button>
            <div style={{ display: 'flex', gap: 22, marginTop: 10 }}>
              {[
                ['Workouts', sessions.length.toLocaleString()],
                ['Streak', `${streak} wk`],
                ['Volume', totalVolume >= 100000 ? `${(totalVolume / 1000).toFixed(0)}k ${unit}` : fmtVolume(totalVolume, unit)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="dim" style={{ fontSize: 12.5 }}>
                    {label}
                  </div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="num" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {headline}
            </span>
            <span className="dim" style={{ fontSize: 14 }}>
              this week
            </span>
          </div>
          <div style={{ height: 150, margin: '14px -4px 12px' }}>
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeks} barCategoryGap="22%">
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} tick={{ fill: '#7C7C87', fontSize: 11 }} />
                  <Bar dataKey={metric} radius={[5, 5, 2, 2]} minPointSize={3} isAnimationActive={false}>
                    {weeks.map((w, i) => (
                      <Cell key={w.start} fill={i === weeks.length - 1 ? '#2F8CFF' : 'rgba(47,140,255,0.38)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dim" style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: 14 }}>
                Your last 12 weeks will chart here
              </div>
            )}
          </div>
          <div className="seg">
            {(['duration', 'volume', 'reps'] as Metric[]).map((m) => (
              <button key={m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <p className="section-label" style={{ margin: '8px 2px -4px' }}>
          Dashboard
        </p>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {DASHBOARD.map(({ label, hint, icon: Icon, color, screen }) => (
            <button
              key={label}
              className="card tappable"
              onClick={() => push(screen)}
              style={{ padding: 14, textAlign: 'left', color: 'var(--text)' }}
            >
              <span className="avatar" style={{ width: 38, height: 38, borderRadius: 11, background: `${color}22`, color, marginBottom: 12 }}>
                <Icon size={20} />
              </span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{label}</span>
                <ChevronRight size={17} color="var(--text-3)" />
              </span>
              <span className="dim" style={{ fontSize: 13 }}>
                {hint}
              </span>
            </button>
          ))}
        </section>
      </div>

      {editing && (
        <Sheet title="Your name" onClose={() => setEditing(false)}>
          <div style={{ display: 'grid', gap: 10, padding: '0 4px' }}>
            <input className="field" autoFocus maxLength={30} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button
              className="btn primary block"
              onClick={() => {
                if (draft.trim()) setProfileName(draft.trim());
                setEditing(false);
              }}
            >
              Save
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
