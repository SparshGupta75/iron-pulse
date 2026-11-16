import { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, ChevronRight, Plus } from 'lucide-react';
import { db } from '../../db/db';
import type { Exercise, EquipmentCategory, MuscleGroup } from '../../types';
import { ExerciseAvatar } from '../ui';
import { useNav } from '../../store/navStore';

const EQUIPMENT: EquipmentCategory[] = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Cardio'];
const MUSCLE_FILTERS: { label: string; muscles: MuscleGroup[] }[] = [
  { label: 'Chest', muscles: ['Chest'] },
  { label: 'Back', muscles: ['Lats', 'Upper Back', 'Lower Back', 'Traps'] },
  { label: 'Shoulders', muscles: ['Front Delts', 'Side Delts', 'Rear Delts'] },
  { label: 'Arms', muscles: ['Biceps', 'Triceps', 'Forearms'] },
  { label: 'Legs', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors', 'Abductors', 'Hip Flexors'] },
  { label: 'Core', muscles: ['Abs', 'Obliques'] },
];

interface Props {
  /** Single pick (also used when browsing the library). */
  onSelect?: (exercise: Exercise) => void;
  /** Multi pick: shows checkmarks and an "Add n exercises" button. */
  onSelectMany?: (exercises: Exercise[]) => void;
  onClose: () => void;
  onCreateNew?: () => void;
  title?: string;
  /** Exercise ids to hide (already in the workout). */
  exclude?: string[];
}

export default function AddExerciseModal({ onSelect, onSelectMany, onClose, onCreateNew, title, exclude }: Props) {
  const version = useNav((s) => s.dataVersion);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<EquipmentCategory | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [picked, setPicked] = useState<Exercise[]>([]);

  useEffect(() => {
    db.exercises.orderBy('name').toArray().then(setExercises);
  }, [version]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const muscles = MUSCLE_FILTERS.find((m) => m.label === muscle)?.muscles;
    return exercises.filter(
      (ex) =>
        !exclude?.includes(ex.id) &&
        (!q || ex.name.toLowerCase().includes(q) || ex.primaryMuscles.some((m) => m.toLowerCase().includes(q))) &&
        (!equipment || ex.category === equipment) &&
        (!muscles || ex.primaryMuscles.some((m) => muscles.includes(m)))
    );
  }, [exercises, search, equipment, muscle, exclude]);

  const multi = Boolean(onSelectMany);
  const toggle = (ex: Exercise) => {
    if (!multi) return onSelect?.(ex);
    setPicked((p) => (p.some((x) => x.id === ex.id) ? p.filter((x) => x.id !== ex.id) : [...p, ex]));
  };

  return (
    <div className="sheet-full" style={{ zIndex: 50 }}>
      <div className="topbar" style={{ paddingLeft: 4, borderBottom: 0 }}>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>
        <h1>{title ?? 'Add Exercise'}</h1>
        {onCreateNew && (
          <button className="btn ghost sm" onClick={onCreateNew}>
            <Plus size={16} /> Create
          </button>
        )}
      </div>

      <div className="pad" style={{ paddingBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: 14 }} />
          <input
            className="field"
            placeholder="Search exercise"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42, background: 'var(--surface-2)', border: 0 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 8px' }}>
        {EQUIPMENT.map((c) => (
          <button key={c} className={`chip${equipment === c ? ' on' : ''}`} onClick={() => setEquipment(equipment === c ? null : c)}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 10px', borderBottom: '1px solid var(--line)' }}>
        {MUSCLE_FILTERS.map((m) => (
          <button key={m.label} className={`chip${muscle === m.label ? ' on' : ''}`} onClick={() => setMuscle(muscle === m.label ? null : m.label)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="scroll">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <p style={{ margin: 0, fontWeight: 650 }}>No exercises found</p>
            <p className="dim" style={{ margin: '6px 0 16px', fontSize: 14 }}>
              Try a different search or filter.
            </p>
            {onCreateNew && (
              <button className="btn soft" onClick={onCreateNew}>
                <Plus size={16} /> Create custom exercise
              </button>
            )}
          </div>
        ) : (
          filtered.map((ex) => {
            const on = picked.some((x) => x.id === ex.id);
            return (
              <div
                key={ex.id}
                className="tappable"
                onClick={() => toggle(ex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 16px',
                  borderLeft: `3px solid ${on ? 'var(--accent)' : 'transparent'}`,
                  background: on ? 'var(--accent-soft)' : undefined,
                }}
              >
                <ExerciseAvatar exercise={ex} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.name}
                  </div>
                  <div className="dim" style={{ fontSize: 13.5, marginTop: 1 }}>
                    {ex.primaryMuscles.join(', ')}
                    {ex.isCustom ? ' · Custom' : ''}
                  </div>
                </div>
                {multi ? (
                  on && <Check size={20} color="var(--accent)" strokeWidth={3} />
                ) : (
                  <ChevronRight size={18} color="var(--text-3)" />
                )}
              </div>
            );
          })
        )}
        <div style={{ height: 96 }} />
      </div>

      {multi && picked.length > 0 && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(16px + var(--safe-b))' }}>
          <button
            className="btn primary block"
            style={{ height: 52, boxShadow: '0 10px 30px rgba(47,140,255,0.4)' }}
            onClick={() => onSelectMany?.(picked)}
          >
            Add {picked.length} exercise{picked.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
