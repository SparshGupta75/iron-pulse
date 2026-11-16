import type { Exercise, WorkoutSession, WorkoutSet } from '../types';
import { fmtDuration, fmtSet, fmtVolume } from './format';

interface CardInput {
  session: WorkoutSession;
  groups: { exerciseId: string; sets: WorkoutSet[] }[];
  exercises: Map<string, Exercise>;
  unit: string;
  name: string;
}

const W = 1080;
const H = 1350;
const FONT = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** The heaviest (or longest) set of an exercise, for the right-hand column. */
function bestSet(sets: WorkoutSet[]): WorkoutSet {
  return sets.reduce((a, s) => (s.weight * 1000 + s.reps + (s.durationSec ?? 0) > a.weight * 1000 + a.reps + (a.durationSec ?? 0) ? s : a));
}

/** Draw a 1080 x 1350 summary image of a finished workout. */
export function renderWorkoutCard({ session, groups, exercises, unit, name }: CardInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(140, 80, 0, 140, 80, 900);
  glow.addColorStop(0, 'rgba(47,140,255,0.42)');
  glow.addColorStop(1, 'rgba(47,140,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W, H, 0, W, H, 760);
  glow2.addColorStop(0, 'rgba(47,214,123,0.18)');
  glow2.addColorStop(1, 'rgba(47,214,123,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const X = 84;
  // Brand mark
  const g = ctx.createLinearGradient(0, 84, 0, 164);
  g.addColorStop(0, '#5AA9FF');
  g.addColorStop(1, '#1862D6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(X, 84, 80, 80, 20);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  [
    [98, 126],
    [112, 126],
    [119, 108],
    [128, 144],
    [136, 116],
    [141, 126],
    [150, 126],
  ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 40px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('IronPulse', X + 104, 126);

  // Title
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText(ellipsize(ctx, session.routineName || 'Workout', W - X * 2), X, 320);
  ctx.fillStyle = '#A3A3AD';
  ctx.font = `500 38px ${FONT}`;
  const date = new Date(session.startedAt).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`${name} · ${date}`, X, 384);

  // Stats
  const sets = groups.reduce((a, gr) => a + gr.sets.length, 0);
  const stats: [string, string][] = [
    ['Duration', fmtDuration((session.finishedAt ?? session.startedAt) - session.startedAt)],
    ['Volume', fmtVolume(session.totalVolume, unit)],
    ['Sets', String(sets)],
  ];
  if (session.prCount) stats.push(['Records', String(session.prCount)]);
  const colW = (W - X * 2) / stats.length;
  stats.forEach(([label, value], i) => {
    const x = X + i * colW;
    ctx.fillStyle = '#7C7C87';
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(label, x, 476);
    ctx.fillStyle = label === 'Records' ? '#F5B83D' : '#fff';
    ctx.font = `750 52px ${FONT}`;
    ctx.fillText(value, x, 540);
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X, 596);
  ctx.lineTo(W - X, 596);
  ctx.stroke();

  // Exercises
  const MAX = 8;
  const shown = groups.slice(0, groups.length > MAX ? MAX - 1 : MAX);
  let y = 676;
  shown.forEach((gr) => {
    const ex = exercises.get(gr.exerciseId);
    const right = fmtSet(bestSet(gr.sets), ex?.trackingType, unit);
    ctx.font = `500 36px ${FONT}`;
    ctx.fillStyle = '#A3A3AD';
    ctx.textAlign = 'right';
    ctx.fillText(right, W - X, y);
    const rightW = ctx.measureText(right).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2F8CFF';
    ctx.font = `750 40px ${FONT}`;
    const count = `${gr.sets.length} ×`;
    ctx.fillText(count, X, y);
    ctx.fillStyle = '#fff';
    ctx.font = `600 40px ${FONT}`;
    const nameX = X + 84;
    ctx.fillText(ellipsize(ctx, ex?.name ?? 'Exercise', W - X - nameX - rightW - 30), nameX, y);
    y += 74;
  });
  if (groups.length > shown.length) {
    ctx.fillStyle = '#7C7C87';
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText(`+ ${groups.length - shown.length} more exercises`, X, y);
  }

  ctx.fillStyle = '#7C7C87';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText('Tracked with IronPulse', X, H - 84);
  return canvas;
}

/** Hand a file to the phone's share sheet, or download it where sharing files isn't supported. */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return; // user closed the share sheet
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function shareWorkoutCard(input: CardInput): Promise<void> {
  const canvas = renderWorkoutCard(input);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) await shareOrDownload(blob, 'workout.png', input.session.routineName ?? 'Workout');
}
