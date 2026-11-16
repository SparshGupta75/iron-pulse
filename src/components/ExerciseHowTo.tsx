import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExerciseDemo } from './ui';
import { EXERCISE_MEDIA } from '../db/exerciseMedia';

/** Looping demo photos plus step-by-step instructions for built-in exercises. */
export function ExerciseHowTo({ exerciseId, defaultOpen = false }: { exerciseId: string; defaultOpen?: boolean }) {
  const [steps, setSteps] = useState<string[]>([]);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let cancelled = false;
    setSteps([]);
    if (!EXERCISE_MEDIA[exerciseId]) return;
    // Loaded on demand so the instructions don't weigh down app start-up.
    import('../db/exerciseInstructions.json').then((m) => {
      const all = m.default as Record<string, string[]>;
      if (!cancelled) setSteps(all[exerciseId] ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!EXERCISE_MEDIA[exerciseId]) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <ExerciseDemo exerciseId={exerciseId} />
      {steps.length > 0 && (
        <div className="card" style={{ marginTop: 10, padding: '4px 14px' }}>
          <button
            onClick={() => setOpen(!open)}
            style={{ display: 'flex', alignItems: 'center', width: '100%', height: 44, border: 0, background: 'none', color: 'var(--text)', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>How to do it</span>
            {open ? <ChevronUp size={18} color="var(--text-3)" /> : <ChevronDown size={18} color="var(--text-3)" />}
          </button>
          {open && (
            <ol style={{ margin: 0, padding: '0 0 12px 20px', display: 'grid', gap: 8 }}>
              {steps.map((s, i) => (
                <li key={i} className="muted" style={{ fontSize: 14.5, lineHeight: 1.45 }}>
                  {s}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
