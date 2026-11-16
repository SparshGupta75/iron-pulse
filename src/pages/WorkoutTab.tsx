import { useEffect, useMemo, useState } from 'react';
import { Plus, ClipboardList, BookOpen, ChevronDown, ChevronRight, Ellipsis, FolderPlus, Pencil, Copy, Trash2, Search } from 'lucide-react';
import { db } from '../db/db';
import type { Exercise, Routine, RoutineFolder } from '../types';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNav } from '../store/navStore';
import { ConfirmSheet, Sheet, SheetItem } from '../components/ui';
import { FolderManager } from '../components/routines/FolderManager';

/** Start a workout, asking first if one is already running. */
export function useStartWorkout() {
  const defaultRest = useSettingsStore((s) => s.defaultRest);
  const openLogger = useNav((s) => s.openLogger);
  const [pending, setPending] = useState<Routine | 'empty' | null>(null);

  const begin = (r: Routine | 'empty') => {
    const { startSession } = useWorkoutStore.getState();
    if (r === 'empty') startSession(undefined, undefined, undefined, defaultRest);
    else startSession(r.id, r.name, r.exercises, defaultRest);
    openLogger();
  };
  const start = (r: Routine | 'empty') => {
    if (useWorkoutStore.getState().activeSession) setPending(r);
    else begin(r);
  };
  const dialog = pending && (
    <Sheet
      title="Workout in progress"
      subtitle="You already have a workout running. Starting a new one will discard it."
      onClose={() => setPending(null)}
    >
      <div style={{ display: 'grid', gap: 8, padding: '4px 4px 0' }}>
        <button className="btn primary block" onClick={() => (setPending(null), openLogger())}>
          Resume Workout
        </button>
        <button className="btn danger block" onClick={() => (begin(pending), setPending(null))}>
          Discard &amp; Start New
        </button>
        <button className="btn block" onClick={() => setPending(null)}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
  return { start, dialog };
}

export default function WorkoutTab() {
  const { push, bump, dataVersion } = useNav();
  const { start, dialog } = useStartWorkout();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [menuFor, setMenuFor] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const [folderManager, setFolderManager] = useState(false);

  useEffect(() => {
    Promise.all([db.routines.toArray(), db.settings.get('routineFolders'), db.exercises.toArray()]).then(
      ([r, f, ex]) => {
        setRoutines(r.sort((a, b) => a.createdAt - b.createdAt));
        setFolders(Array.isArray(f?.value) ? (f.value as RoutineFolder[]) : []);
        setNames(new Map(ex.map((e: Exercise) => [e.id, e.name])));
      }
    );
  }, [dataVersion]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? routines.filter((r) => r.name.toLowerCase().includes(q)) : routines;
    const known = new Set(folders.map((f) => f.id));
    const out = folders
      .map((f) => ({ id: f.id, name: f.name, routines: list.filter((r) => r.folderId === f.id) }))
      .filter((g) => g.routines.length > 0 || !q);
    const loose = list.filter((r) => !r.folderId || !known.has(r.folderId));
    if (loose.length) out.push({ id: '__loose', name: 'My Routines', routines: loose });
    return out;
  }, [routines, folders, search]);

  const duplicate = async (r: Routine) => {
    await db.routines.put({ ...r, id: `routine-${Date.now()}`, name: `${r.name} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() });
    bump();
  };

  return (
    <div className="scroll">
      <header className="pad" style={{ paddingTop: 18, paddingBottom: 6 }}>
        <h1 className="page-title">Workout</h1>
      </header>

      <div className="pad" style={{ paddingBottom: 32 }}>
        <p className="section-label" style={{ margin: '14px 2px 10px' }}>
          Quick Start
        </p>
        <button
          className="card tappable hero-glow"
          onClick={() => start('empty')}
          style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 16, textAlign: 'left', color: 'var(--text)' }}
        >
          <span className="avatar" style={{ width: 44, height: 44, background: 'var(--accent)', boxShadow: '0 8px 22px rgba(47,140,255,0.45)' }}>
            <Plus size={24} strokeWidth={2.6} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 17, fontWeight: 700 }}>Start Empty Workout</span>
            <span className="muted" style={{ fontSize: 14 }}>
              Add exercises as you go
            </span>
          </span>
          <ChevronRight size={20} color="var(--text-3)" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '26px 2px 10px' }}>
          <p className="section-label" style={{ flex: 1, fontSize: 20, fontWeight: 750, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Routines
          </p>
          <button className="icon-btn" onClick={() => setFolderManager(true)} aria-label="Manage folders">
            <FolderPlus size={21} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn" style={{ height: 50, background: 'var(--surface)', border: '1px solid var(--line)' }} onClick={() => push({ type: 'routine', id: null })}>
            <ClipboardList size={19} /> New Routine
          </button>
          <button className="btn" style={{ height: 50, background: 'var(--surface)', border: '1px solid var(--line)' }} onClick={() => push({ type: 'exercises' })}>
            <BookOpen size={19} /> Exercises
          </button>
        </div>

        {routines.length > 5 && (
          <div style={{ position: 'relative', marginTop: 12 }}>
            <Search size={18} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: 14 }} />
            <input className="field" placeholder="Search routines" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 42 }} />
          </div>
        )}

        {routines.length === 0 && (
          <div className="card" style={{ marginTop: 14, padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>No routines yet</div>
            <p className="dim" style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.45 }}>
              Build a routine once and start it with one tap.
            </p>
          </div>
        )}

        {groups.map((g) => {
          const closed = collapsed.has(g.id);
          return (
            <section key={g.id} style={{ marginTop: 18 }}>
              <button
                onClick={() => {
                  const next = new Set(collapsed);
                  if (closed) next.delete(g.id);
                  else next.add(g.id);
                  setCollapsed(next);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 2px', border: 0, background: 'none', color: 'var(--text-2)', fontSize: 15, fontWeight: 650, cursor: 'pointer' }}
              >
                {closed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                {g.name} <span className="dim">({g.routines.length})</span>
              </button>

              {!closed && (
                <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
                  {g.routines.length === 0 && (
                    <div className="dim" style={{ fontSize: 14, padding: '4px 26px 2px' }}>
                      No routines in this folder
                    </div>
                  )}
                  {g.routines.map((r) => (
                    <article key={r.id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }} onClick={() => push({ type: 'routine', id: r.id })}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.name}</div>
                          <div
                            className="dim"
                            style={{ marginTop: 4, fontSize: 14.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {r.exercises.length
                              ? r.exercises.map((e) => names.get(e.exerciseId) ?? 'Exercise').join(', ')
                              : 'No exercises yet'}
                          </div>
                        </div>
                        <button
                          className="icon-btn"
                          style={{ margin: '-8px -8px 0 0' }}
                          aria-label="Routine options"
                          onClick={(e) => (e.stopPropagation(), setMenuFor(r))}
                        >
                          <Ellipsis size={20} color="var(--text-2)" />
                        </button>
                      </div>
                      <button className="btn primary block" style={{ marginTop: 14, height: 42 }} onClick={() => start(r)}>
                        Start Routine
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {menuFor && (
        <Sheet title={menuFor.name} onClose={() => setMenuFor(null)}>
          <SheetItem icon={<Pencil size={20} />} label="Edit Routine" onClick={() => (push({ type: 'routine', id: menuFor.id }), setMenuFor(null))} />
          <SheetItem icon={<Copy size={20} />} label="Duplicate Routine" onClick={() => (duplicate(menuFor), setMenuFor(null))} />
          <SheetItem danger icon={<Trash2 size={20} />} label="Delete Routine" onClick={() => (setDeleting(menuFor), setMenuFor(null))} />
        </Sheet>
      )}
      {deleting && (
        <ConfirmSheet
          title="Delete routine?"
          message={`"${deleting.name}" will be removed. Your workout history stays.`}
          confirmLabel="Delete Routine"
          danger
          onConfirm={async () => {
            await db.routines.delete(deleting.id);
            bump();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
      {folderManager && (
        <FolderManager
          folders={folders}
          onSaveFolders={async (next) => {
            await db.settings.put({ key: 'routineFolders', value: next });
            bump();
          }}
          onClose={() => setFolderManager(false)}
        />
      )}
      {dialog}
    </div>
  );
}
