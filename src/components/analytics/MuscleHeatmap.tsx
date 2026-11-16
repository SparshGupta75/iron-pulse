import { useState } from 'react';
import type { MuscleGroup } from '../../types';

interface MuscleData {
  sets: number;
  lastTrainedHoursAgo: number | null; // hours elapsed
  recoveryPercent: number; // 0-100%
  exercises: string[];
}

interface Props {
  muscleStats: Record<MuscleGroup, MuscleData>;
  onSelectMuscle?: (muscle: MuscleGroup) => void;
}

const TIERS = [
  { max: 0, color: '#2A2A31', label: 'None', note: 'Not trained in this period.' },
  { max: 5, color: '#2F8CFF', label: 'Low', note: 'Maintenance volume. Add sets if you want this muscle to grow.' },
  { max: 16, color: '#2FD67B', label: 'Optimal', note: 'In the productive range for growth.' },
  { max: 22, color: '#F5B83D', label: 'High', note: 'Near the most you can recover from. Watch fatigue.' },
  { max: Infinity, color: '#FF5A5F', label: 'Very high', note: 'Above recoverable volume for most people. Consider a deload.' },
];
const tierOf = (sets: number) => TIERS.find((t) => sets <= t.max) ?? TIERS[0];

/**
 * Muscle outlines on a 200 x 380 figure centred on x = 100. Shapes with
 * `mirror` are drawn for the viewer's right side and reflected for the left.
 */
type Shape = { muscle: MuscleGroup; d: string; mirror?: boolean };

const FRONT: Shape[] = [
  { muscle: 'Traps', mirror: true, d: 'M100 47 L107 47 C111 54 120 58 129 60 C120 62 108 63 100 63 Z' },
  { muscle: 'Front Delts', mirror: true, d: 'M130 61 C137 58 144 61 146 69 C147 79 144 89 140 95 C134 88 131 76 130 61 Z' },
  { muscle: 'Side Delts', mirror: true, d: 'M147 64 C154 67 158 78 156 94 C152 93 148 89 148 80 C148 74 148 69 147 64 Z' },
  { muscle: 'Chest', mirror: true, d: 'M102 66 C111 62 123 62 128 66 C132 77 135 88 137 96 C129 107 112 109 102 104 Z' },
  { muscle: 'Biceps', mirror: true, d: 'M142 98 C149 96 155 100 156 110 C157 120 155 128 152 133 C147 130 143 124 142 114 Z' },
  { muscle: 'Forearms', mirror: true, d: 'M151 137 C157 135 161 139 163 149 C165 162 167 175 167 187 C164 190 161 190 159 188 C156 174 151 156 151 137 Z' },
  { muscle: 'Abs', d: 'M89 108 C96 112 104 112 111 108 L112 166 C108 176 92 176 88 166 Z' },
  { muscle: 'Obliques', mirror: true, d: 'M114 108 C122 107 130 103 135 100 C135 120 132 150 129 171 C123 174 118 172 115 168 Z' },
  { muscle: 'Hip Flexors', mirror: true, d: 'M103 178 C112 179 122 177 129 175 C127 185 121 192 113 196 C108 192 105 186 103 178 Z' },
  { muscle: 'Adductors', mirror: true, d: 'M101 192 C106 197 110 205 111 217 C111 233 108 248 105 258 C102 250 101 220 101 192 Z' },
  { muscle: 'Quads', mirror: true, d: 'M113 199 C123 193 131 186 134 181 C138 201 137 236 131 263 C125 270 115 270 111 262 C114 240 115 220 113 199 Z' },
  { muscle: 'Calves', mirror: true, d: 'M111 281 C118 276 126 278 129 286 C130 306 126 330 122 345 C119 348 116 348 114 345 C110 326 109 300 111 281 Z' },
];

const BACK: Shape[] = [
  { muscle: 'Traps', d: 'M100 45 C106 51 119 57 131 60 C122 70 108 92 100 112 C92 92 78 70 69 60 C81 57 94 51 100 45 Z' },
  { muscle: 'Rear Delts', mirror: true, d: 'M133 61 C142 58 152 66 155 78 C156 88 152 94 148 97 C141 88 136 76 133 61 Z' },
  { muscle: 'Upper Back', mirror: true, d: 'M111 88 C118 78 126 70 132 67 C136 78 139 88 140 96 C131 101 119 101 111 88 Z' },
  { muscle: 'Lats', mirror: true, d: 'M106 112 C115 105 129 103 139 99 C139 119 133 140 125 158 C118 160 111 157 108 152 Z' },
  { muscle: 'Lower Back', d: 'M95 118 L105 118 L110 174 C104 180 96 180 90 174 Z' },
  { muscle: 'Triceps', mirror: true, d: 'M144 99 C151 95 157 101 158 113 C158 123 156 131 153 135 C147 131 144 122 144 99 Z' },
  { muscle: 'Forearms', mirror: true, d: 'M151 139 C157 137 161 141 163 151 C165 163 167 176 167 187 C164 190 161 190 159 188 C156 174 151 157 151 139 Z' },
  { muscle: 'Abductors', mirror: true, d: 'M117 165 C126 164 133 171 134 182 C128 177 122 176 115 178 Z' },
  { muscle: 'Glutes', mirror: true, d: 'M101 182 C112 177 126 179 133 187 C135 201 131 213 121 217 C111 217 103 213 101 205 Z' },
  { muscle: 'Hamstrings', mirror: true, d: 'M103 221 C112 223 124 221 133 215 C136 232 133 254 129 268 C123 272 113 272 109 266 C105 250 103 236 103 221 Z' },
  { muscle: 'Calves', mirror: true, d: 'M110 281 C116 274 126 274 131 282 C133 300 129 320 124 336 C121 340 117 340 114 336 C110 318 108 298 110 281 Z' },
];

// Neutral body outline (right half; reflected for the left).
const BODY_HALF = [
  'M100 44 L108 44 C112 53 124 57 134 57 C148 57 157 67 158 80 L141 100 C139 130 135 150 132 168 C135 178 136 186 135 196 L100 196 Z',
  'M141 61 C153 59 160 69 160 84 C162 100 160 120 158 133 C164 147 168 170 170 190 C172 199 172 207 168 211 C163 213 159 207 158 197 C153 177 147 153 147 137 C143 123 139 105 139 93 Z',
  'M100 186 L135 180 C141 204 139 240 132 268 C135 290 133 318 125 348 L127 366 C123 373 112 373 110 366 L112 348 C106 320 106 290 108 268 C102 240 100 212 100 186 Z',
];

const MIRROR = 'translate(200 0) scale(-1 1)';

function Figure({
  title,
  shapes,
  stats,
  selected,
  onPick,
}: {
  title: string;
  shapes: Shape[];
  stats: Props['muscleStats'];
  selected: MuscleGroup | null;
  onPick: (m: MuscleGroup) => void;
}) {
  const draw = (s: Shape, key: string, transform?: string) => {
    const on = selected === s.muscle;
    return (
      <path
        key={key}
        d={s.d}
        transform={transform}
        fill={tierOf(stats[s.muscle]?.sets ?? 0).color}
        stroke={on ? '#FFFFFF' : '#0B0B0D'}
        strokeWidth={on ? 2 : 1.2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ cursor: 'pointer', transition: 'fill 0.25s', filter: on ? 'drop-shadow(0 0 5px rgba(255,255,255,0.55))' : undefined }}
        onClick={() => onPick(s.muscle)}
      />
    );
  };
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
      <svg viewBox="28 6 144 372" style={{ width: '100%', maxWidth: 170, height: 'auto', display: 'block', margin: '0 auto' }} role="img" aria-label={`${title} muscle map`}>
        <g fill="#1B1B20">
          <ellipse cx="100" cy="26" rx="13" ry="16" />
          {BODY_HALF.map((d, i) => (
            <path key={i} d={d} />
          ))}
          <g transform={MIRROR}>
            {BODY_HALF.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </g>
        {shapes.map((s) => draw(s, s.muscle))}
        {shapes.filter((s) => s.mirror).map((s) => draw(s, `${s.muscle}-m`, MIRROR))}
        {title === 'Front' && (
          <g stroke="#0B0B0D" strokeWidth="1.3" pointerEvents="none" strokeLinecap="round">
            <path d="M100 111 V171 M89 124 H111 M88.5 140 H111.5 M88.5 156 H111.5" fill="none" />
          </g>
        )}
      </svg>
      <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>
        {title.toUpperCase()}
      </div>
    </div>
  );
}

export function MuscleHeatmap({ muscleStats, onSelectMuscle }: Props) {
  const ranked = (Object.keys(muscleStats) as MuscleGroup[])
    .map((m) => ({ muscle: m, ...muscleStats[m] }))
    .sort((a, b) => b.sets - a.sets);
  const trained = ranked.filter((r) => r.sets > 0);
  const [selected, setSelected] = useState<MuscleGroup | null>(null);

  const current = selected ?? trained[0]?.muscle ?? null;
  const data = current ? muscleStats[current] : null;
  const tier = tierOf(data?.sets ?? 0);
  const top = Math.max(1, ranked[0]?.sets ?? 1);

  const pick = (m: MuscleGroup) => {
    setSelected(m);
    onSelectMuscle?.(m);
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 750 }}>Muscles Worked</h3>
      <p className="dim" style={{ margin: '2px 0 14px', fontSize: 13 }}>
        Working sets per muscle. Tap a muscle for details.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '18px 10px 12px',
          borderRadius: 16,
          background: 'radial-gradient(80% 60% at 50% 35%, rgba(47,140,255,0.10), transparent 70%), #0B0B0D',
          border: '1px solid var(--line)',
        }}
      >
        <Figure title="Front" shapes={FRONT} stats={muscleStats} selected={current} onPick={pick} />
        <Figure title="Back" shapes={BACK} stats={muscleStats} selected={current} onPick={pick} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', margin: '12px 2px 0', fontSize: 12, color: 'var(--text-2)' }}>
        {TIERS.map((t, i) => (
          <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: t.color, border: i === 0 ? '1px solid #3a3a42' : undefined }} />
            {t.label}
            <span className="dim">{i === 0 ? '0' : i === TIERS.length - 1 ? `${TIERS[i - 1].max + 1}+` : `${TIERS[i - 1].max + 1}–${t.max}`}</span>
          </span>
        ))}
      </div>

      {/* Selected muscle */}
      {current && data ? (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i style={{ width: 12, height: 12, borderRadius: 4, background: tier.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 17, fontWeight: 750 }}>{current}</span>
            <span className="num" style={{ fontSize: 15, fontWeight: 700 }}>
              {data.sets} <span className="dim" style={{ fontWeight: 500 }}>sets</span>
            </span>
          </div>
          <p className="muted" style={{ margin: '8px 0 12px', fontSize: 13.5, lineHeight: 1.4 }}>
            <strong style={{ color: tier.color === '#2A2A31' ? 'var(--text-2)' : tier.color }}>{tier.label}.</strong> {tier.note}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span className="muted">Recovery</span>
            <span className="num" style={{ fontWeight: 700, color: data.recoveryPercent >= 90 ? 'var(--green)' : 'var(--yellow)' }}>
              {data.recoveryPercent}%
            </span>
          </div>
          <div className="progress" style={{ height: 6, borderRadius: 3 }}>
            <i style={{ width: `${data.recoveryPercent}%`, background: data.recoveryPercent >= 90 ? 'var(--green)' : 'var(--yellow)', transition: 'width 0.3s' }} />
          </div>
          <div className="dim" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
            Last trained{' '}
            <span style={{ color: 'var(--text)' }}>
              {data.lastTrainedHoursAgo === null
                ? 'not recently'
                : data.lastTrainedHoursAgo < 1
                  ? 'just now'
                  : data.lastTrainedHoursAgo < 48
                    ? `${Math.round(data.lastTrainedHoursAgo)} h ago`
                    : `${Math.round(data.lastTrainedHoursAgo / 24)} days ago`}
            </span>
            {data.exercises.length > 0 && <> · {data.exercises.slice(0, 3).join(', ')}</>}
          </div>
        </div>
      ) : (
        <p className="dim" style={{ margin: '16px 0 4px', fontSize: 14, textAlign: 'center' }}>
          Log a workout to light up the muscles you trained.
        </p>
      )}

      {/* Ranking */}
      {trained.length > 0 && (
        <div style={{ display: 'grid', gap: 2, marginTop: 12 }}>
          {trained.map((r) => (
            <button
              key={r.muscle}
              onClick={() => pick(r.muscle)}
              style={{
                display: 'grid',
                gridTemplateColumns: '104px 1fr 28px',
                alignItems: 'center',
                gap: 10,
                height: 34,
                padding: '0 8px',
                border: 0,
                borderRadius: 9,
                background: current === r.muscle ? 'var(--surface-2)' : 'transparent',
                color: 'var(--text)',
                fontSize: 13.5,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.muscle}</span>
              <span style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <i style={{ display: 'block', height: '100%', width: `${(r.sets / top) * 100}%`, borderRadius: 4, background: tierOf(r.sets).color }} />
              </span>
              <span className="num dim" style={{ textAlign: 'right', fontWeight: 650 }}>
                {r.sets}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
