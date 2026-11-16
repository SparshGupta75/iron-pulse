import type { MuscleGroup, TrackingType, WorkoutSet } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 75 -> "1:15", 3700 -> "1:01:40" */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Milliseconds -> "1h 12min" / "42min" / "35s" */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function fmtRest(sec: number): string {
  if (!sec) return 'Off';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m && s) return `${m}min ${s}s`;
  return m ? `${m}min` : `${s}s`;
}

export function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString();
}

export function fmtVolume(v: number, unit: string): string {
  return `${Math.round(v).toLocaleString()} ${unit}`;
}

export function relDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const dayMs = 86400000;
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / dayMs);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today at ${time}`;
  if (diff === 1) return `Yesterday at ${time}`;
  if (diff < 7) return `${d.toLocaleDateString([], { weekday: 'long' })} at ${time}`;
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export const dayKey = (ts: number | Date): string => {
  const d = typeof ts === 'number' ? new Date(ts) : ts;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Monday 00:00 of the week containing ts. */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
}

/** Epley estimated one-rep max. */
export const e1rm = (w: number, r: number): number => (r <= 1 ? w : w * (1 + r / 30));

export const uid = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const sessionVolume = (sets: WorkoutSet[]): number =>
  sets.filter((s) => s.completed && s.type !== 'warmup').reduce((a, s) => a + s.weight * s.reps, 0);

const MUSCLE_HUE: Partial<Record<MuscleGroup, string>> = {
  Chest: '#2F8CFF',
  'Front Delts': '#F5B83D',
  'Side Delts': '#F5B83D',
  'Rear Delts': '#F5B83D',
  Biceps: '#B57BFF',
  Triceps: '#B57BFF',
  Forearms: '#B57BFF',
  Lats: '#2FD67B',
  'Upper Back': '#2FD67B',
  'Lower Back': '#2FD67B',
  Traps: '#2FD67B',
  Abs: '#FF8A4C',
  Obliques: '#FF8A4C',
  Glutes: '#FF6B9A',
  Quads: '#FF6B9A',
  Hamstrings: '#FF6B9A',
  Calves: '#FF6B9A',
};

export const muscleColor = (m?: MuscleGroup): string => (m && MUSCLE_HUE[m]) || '#2F8CFF';

/** Weekly streak: consecutive weeks (ending this or last week) with at least one workout. */
export function weekStreak(startTimes: number[]): number {
  const weeks = new Set(startTimes.map(weekStart));
  let cursor = weekStart(Date.now());
  if (!weeks.has(cursor)) cursor -= 7 * 86400000;
  let n = 0;
  while (weeks.has(weekStart(cursor + 3600000 * 12))) {
    n++;
    cursor = weekStart(cursor - 86400000);
  }
  return n;
}

/** 95 -> "1:35" */
export const fmtTime = (sec: number): string => `${Math.floor(sec / 60)}:${pad(Math.round(sec) % 60)}`;

/** Digits typed on a number pad, read like a microwave: "130" -> 90 seconds. */
export function digitsToSeconds(raw: string): number {
  const d = raw.replace(/\D/g, '').slice(-5);
  if (!d) return 0;
  return parseInt(d.slice(-2), 10) + (parseInt(d.slice(0, -2) || '0', 10) || 0) * 60;
}

/** One logged set as text, according to how the exercise is tracked. */
export function fmtSet(s: WorkoutSet, type: TrackingType | undefined, unit: string): string {
  if (type === 'Time') return s.durationSec ? fmtTime(s.durationSec) : `${s.reps} reps`;
  if (type === 'Distance') {
    const parts = [s.distanceKm ? `${fmtNum(s.distanceKm)} km` : '', s.durationSec ? fmtTime(s.durationSec) : ''];
    return parts.filter(Boolean).join(' in ') || '—';
  }
  if (type === 'RepsOnly') return s.weight ? `+${fmtNum(s.weight)} ${unit} x ${s.reps}` : `${s.reps} reps`;
  return s.weight ? `${fmtNum(s.weight)} ${unit} x ${s.reps}` : `${s.reps} reps`;
}
