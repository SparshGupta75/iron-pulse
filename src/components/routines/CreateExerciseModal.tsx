import { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db/db';
import type { Exercise, EquipmentCategory, MuscleGroup, TrackingType } from '../../types';

const CATEGORIES: EquipmentCategory[] = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'];
const TRACKING_TYPES: TrackingType[] = ['WeightReps', 'RepsOnly', 'Time', 'Distance'];
const ALL_MUSCLES: MuscleGroup[] = [
  'Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Biceps', 'Triceps',
  'Lats', 'Upper Back', 'Lower Back', 'Traps', 'Abs', 'Obliques',
  'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Forearms', 'Hip Flexors', 'Adductors', 'Abductors',
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

export default function CreateExerciseModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Barbell');
  const [trackingType, setTrackingType] = useState<TrackingType>('WeightReps');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleMuscle(muscle: MuscleGroup, group: 'primary' | 'secondary') {
    if (group === 'primary') {
      setPrimaryMuscles((prev) =>
        prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
      );
    } else {
      setSecondaryMuscles((prev) =>
        prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
      );
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Exercise name is required'); return; }
    if (primaryMuscles.length === 0) { setError('Select at least 1 primary muscle'); return; }
    setSaving(true);
    const exercise: Exercise = {
      id: generateId(),
      name: name.trim(),
      category,
      primaryMuscles,
      secondaryMuscles,
      trackingType,
      isCustom: true,
      notes: notes.trim() || undefined,
    };
    await db.exercises.add(exercise);
    onCreated(exercise);
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    backgroundColor: '#141416', border: '1px solid #232327',
    borderRadius: 8, color: '#FAFAFA', fontSize: 14, outline: 'none',
  };

  const labelStyle = { fontSize: 12, color: '#A1A1AA', marginBottom: 6, display: 'block' as const, fontWeight: 500 };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      backgroundColor: '#000000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 12px',
        borderBottom: '1px solid #232327',
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA' }}>
          <X size={22} />
        </button>
        <h2 style={{ flex: 1, fontSize: 18, fontWeight: 600, color: '#FAFAFA', margin: 0 }}>Create Exercise</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#2F8CFF', border: 'none', borderRadius: 8,
            padding: '8px 16px', color: '#FAFAFA', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div style={{ backgroundColor: '#EF444422', border: '1px solid #EF4444', borderRadius: 8, padding: '10px 12px', color: '#EF4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label style={labelStyle}>Exercise Name *</label>
          <input
            type="text"
            placeholder="e.g. Incline Dumbbell Curl"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${category === cat ? '#2F8CFF' : '#232327'}`,
                  backgroundColor: category === cat ? '#2F8CFF22' : 'transparent',
                  color: category === cat ? '#2F8CFF' : '#A1A1AA',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tracking Type */}
        <div>
          <label style={labelStyle}>Tracking Type</label>
          <select
            value={trackingType}
            onChange={(e) => setTrackingType(e.target.value as TrackingType)}
            style={{ ...inputStyle, appearance: 'none' as const }}
          >
            {TRACKING_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Primary Muscles */}
        <div>
          <label style={labelStyle}>Primary Muscles * {primaryMuscles.length > 0 && `(${primaryMuscles.length} selected)`}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {ALL_MUSCLES.map((m) => {
              const sel = primaryMuscles.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m, 'primary')}
                  style={{
                    padding: '5px 10px', borderRadius: 16,
                    border: `1px solid ${sel ? '#2FD67B' : '#232327'}`,
                    backgroundColor: sel ? '#2FD67B22' : 'transparent',
                    color: sel ? '#2FD67B' : '#A1A1AA',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Muscles */}
        <div>
          <label style={labelStyle}>Secondary Muscles {secondaryMuscles.length > 0 && `(${secondaryMuscles.length} selected)`}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {ALL_MUSCLES.map((m) => {
              const sel = secondaryMuscles.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m, 'secondary')}
                  style={{
                    padding: '5px 10px', borderRadius: 16,
                    border: `1px solid ${sel ? '#F59E0B' : '#232327'}`,
                    backgroundColor: sel ? '#F59E0B22' : 'transparent',
                    color: sel ? '#F59E0B' : '#A1A1AA',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            placeholder="Technique cues, tips…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'none' as const }}
          />
        </div>
      </div>
    </div>
  );
}
