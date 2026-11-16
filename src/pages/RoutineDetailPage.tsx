import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Play,
  Dumbbell,
} from 'lucide-react';
import { db } from '../db/db';
import type { Routine, RoutineExercise, Exercise, RoutineFolder } from '../types';
import AddExerciseModal from '../components/workout/AddExerciseModal';
import CreateExerciseModal from '../components/routines/CreateExerciseModal';

interface Props {
  routineId: string | null;
  folders: RoutineFolder[];
  onBack: () => void;
  onSaved: () => void;
  onStartWorkout: (routine: Routine) => void;
}

export function RoutineDetailPage({
  routineId,
  folders,
  onBack,
  onSaved,
  onStartWorkout,
}: Props) {
  const [name, setName] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [exerciseMeta, setExerciseMeta] = useState<Map<string, Exercise>>(new Map());
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (routineId) {
      db.routines.get(routineId).then((r: Routine | undefined) => {
        if (r) {
          setName(r.name);
          setFolderId(r.folderId || '');
          setExercises(r.exercises || []);
        }
      });
    } else {
      setName('New Routine');
      setExercises([]);
    }
  }, [routineId]);

  useEffect(() => {
    if (exercises.length === 0) return;
    const exIds = exercises.map((e) => e.exerciseId);
    db.exercises
      .where('id')
      .anyOf(exIds)
      .toArray()
      .then((list: Exercise[]) => {
        const map = new Map<string, Exercise>();
        list.forEach((item) => map.set(item.id, item));
        setExerciseMeta(map);
      });
  }, [exercises]);

  const handleAddExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        sets: 3,
        repMin: 8,
        repMax: 12,
        restSeconds: 90,
        notes: '',
      },
    ]);
    setShowAddModal(false);
  };

  const handleUpdateExercise = (index: number, updates: Partial<RoutineExercise>) => {
    setExercises((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const next = [...exercises];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setExercises(next);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a routine name');
      return;
    }
    setIsSaving(true);
    const now = Date.now();
    const id = routineId || `routine-${now}-${Math.random().toString(36).slice(2, 7)}`;

    const routineToSave: Routine = {
      id,
      name: name.trim(),
      folderId: folderId || undefined,
      exercises,
      createdAt: now,
      updatedAt: now,
    };

    await db.routines.put(routineToSave);
    setIsSaving(false);
    onSaved();
  };

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80, backgroundColor: '#000000' }}>
      {/* Top Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#141416',
          borderBottom: '1px solid #232327',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#A1A1AA',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {routineId && (
            <button
              onClick={() => {
                const currentRoutine: Routine = {
                  id: routineId,
                  name: name || 'Routine',
                  folderId: folderId || undefined,
                  exercises,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                onStartWorkout(currentRoutine);
              }}
              style={{
                backgroundColor: 'rgba(47,140,255,0.15)',
                border: '1px solid #2F8CFF',
                color: '#2F8CFF',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Play size={13} fill="#2F8CFF" /> Start
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: '#2FD67B',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Name & Folder Fields */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 18,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>
            ROUTINE NAME
          </label>
          <input
            type="text"
            value={name}
            placeholder="e.g. Push Day (Chest & Triceps)"
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#000000',
              border: '1px solid #232327',
              borderRadius: 10,
              color: '#FAFAFA',
              fontSize: 16,
              fontWeight: 700,
              outline: 'none',
              marginBottom: 14,
            }}
          />

          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>
            FOLDER / SPLIT
          </label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#000000',
              border: '1px solid #232327',
              borderRadius: 10,
              color: '#FAFAFA',
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="">No Folder (General)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Exercises List Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FAFAFA' }}>
            Exercises ({exercises.length})
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2F8CFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={16} /> Add Movement
          </button>
        </div>

        {/* Exercises */}
        {exercises.length === 0 ? (
          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 16,
              padding: '36px 20px',
              textAlign: 'center',
              border: '1px dashed #232327',
              marginBottom: 20,
            }}
          >
            <Dumbbell size={36} color="#34343A" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>
              No exercises added to routine
            </p>
            <p style={{ margin: '4px 0 16px', fontSize: 12, color: '#7C7C87' }}>
              Add movements and configure target sets and rep ranges.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                backgroundColor: '#2F8CFF',
                border: 'none',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus size={15} /> Add Exercise
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {exercises.map((re, index) => {
              const meta = exerciseMeta.get(re.exerciseId);
              return (
                <div
                  key={`${re.exerciseId}-${index}`}
                  style={{
                    backgroundColor: '#141416',
                    borderRadius: 14,
                    padding: 14,
                    border: '1px solid #232327',
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          backgroundColor: '#232327',
                          color: '#A1A1AA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
                          {meta ? meta.name : 'Exercise'}
                        </div>
                        {meta && (
                          <div style={{ fontSize: 11, color: '#7C7C87' }}>
                            {meta.category} • {meta.primaryMuscles.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reorder and Delete controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === 0 ? '#34343A' : '#A1A1AA',
                          padding: 4,
                          cursor: index === 0 ? 'default' : 'pointer',
                        }}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === exercises.length - 1}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: index === exercises.length - 1 ? '#34343A' : '#A1A1AA',
                          padding: 4,
                          cursor: index === exercises.length - 1 ? 'default' : 'pointer',
                        }}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveExercise(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          padding: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Config row: Sets, Rep Range, Rest Seconds */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.3fr 1fr',
                      gap: 10,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid #232327',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                        TARGET SETS
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={re.sets}
                        onChange={(e) =>
                          handleUpdateExercise(index, { sets: parseInt(e.target.value, 10) || 1 })
                        }
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          backgroundColor: '#000000',
                          border: '1px solid #232327',
                          borderRadius: 8,
                          color: '#FAFAFA',
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                        REP RANGE
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          min="1"
                          value={re.repMin}
                          onChange={(e) =>
                            handleUpdateExercise(index, { repMin: parseInt(e.target.value, 10) || 1 })
                          }
                          style={{
                            width: '50%',
                            padding: '6px 6px',
                            backgroundColor: '#000000',
                            border: '1px solid #232327',
                            borderRadius: 8,
                            color: '#FAFAFA',
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <span style={{ color: '#7C7C87', fontSize: 11 }}>–</span>
                        <input
                          type="number"
                          min="1"
                          value={re.repMax}
                          onChange={(e) =>
                            handleUpdateExercise(index, { repMax: parseInt(e.target.value, 10) || 1 })
                          }
                          style={{
                            width: '50%',
                            padding: '6px 6px',
                            backgroundColor: '#000000',
                            border: '1px solid #232327',
                            borderRadius: 8,
                            color: '#FAFAFA',
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7C7C87', marginBottom: 4 }}>
                        REST (SEC)
                      </label>
                      <input
                        type="number"
                        step="15"
                        min="0"
                        value={re.restSeconds}
                        onChange={(e) =>
                          handleUpdateExercise(index, { restSeconds: parseInt(e.target.value, 10) || 60 })
                        }
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          backgroundColor: '#000000',
                          border: '1px solid #232327',
                          borderRadius: 8,
                          color: '#FAFAFA',
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Optional persistent notes */}
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Exercise notes (e.g. 2s pause at bottom, seat 5)…"
                      value={re.notes || ''}
                      onChange={(e) => handleUpdateExercise(index, { notes: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        backgroundColor: '#000000',
                        border: '1px solid #232327',
                        borderRadius: 6,
                        color: '#A1A1AA',
                        fontSize: 11,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowAddModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                backgroundColor: '#141416',
                border: '1px dashed #34343A',
                color: '#2F8CFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={16} /> Add Exercise
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddExerciseModal
          onSelect={handleAddExercise}
          onClose={() => setShowAddModal(false)}
          onCreateNew={() => {
            setShowAddModal(false);
            setShowCreateModal(true);
          }}
        />
      )}

      {showCreateModal && (
        <CreateExerciseModal
          onCreated={(newEx: Exercise) => {
            handleAddExercise(newEx);
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
