import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Plus, Dumbbell, Trophy, Medal, Clock, Weight, Check } from 'lucide-react';
import { db } from '../../db/db';
import type { Exercise, WorkoutSession } from '../../types';
import { useWorkoutStore } from '../../store/workoutStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNav } from '../../store/navStore';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { buzz, playChime } from '../../hooks/useWebAudio';
import { findRecords, loadBests } from '../../hooks/useHistory';
import { fmtClock, fmtDuration, fmtVolume, sessionVolume } from '../../utils/format';
import { ConfirmSheet, Stat } from '../ui';
import { ExerciseBlock, SUPERSET_COLORS } from './ExerciseBlock';
import AddExerciseModal from './AddExerciseModal';
import CreateExerciseModal from '../routines/CreateExerciseModal';

interface Celebration {
  session: WorkoutSession;
  sets: number;
  workoutNumber: number;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** Seconds left in the current rest, or 0. Also fires the end-of-rest chime. */
function useRest(now: number): number {
  const restEndsAt = useWorkoutStore((s) => s.restEndsAt);
  useEffect(() => {
    if (!restEndsAt || now < restEndsAt) return;
    // Don't chime for a rest that ended long ago (e.g. app reopened later).
    if (now - restEndsAt < 5000) {
      playChime();
      buzz([180, 90, 180]);
    }
    useWorkoutStore.getState().skipRest();
  }, [now, restEndsAt]);
  return restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
}

/** Collapsed "workout in progress" strip shown above the tab bar. */
export function MiniBar() {
  const session = useWorkoutStore((s) => s.activeSession);
  const loggerOpen = useNav((s) => s.loggerOpen);
  const openLogger = useNav((s) => s.openLogger);
  const now = useNow(Boolean(session) && !loggerOpen);
  const restEndsAt = useWorkoutStore((s) => s.restEndsAt);
  if (!session || loggerOpen) return null;
  const rest = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  return (
    <div className="mini-bar" onClick={openLogger}>
      <span className="pulse-dot" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.routineName}
        </div>
        <div className="num dim" style={{ fontSize: 13 }}>
          {rest > 0 ? (
            <span style={{ color: 'var(--accent)' }}>Rest {fmtClock(rest)}</span>
          ) : (
            fmtClock((now - session.startedAt) / 1000)
          )}
        </div>
      </div>
      <button className="btn soft sm">Resume</button>
    </div>
  );
}

export default function ActiveWorkout() {
  const session = useWorkoutStore((s) => s.activeSession);
  const activeExercises = useWorkoutStore((s) => s.activeExercises);
  const activeSets = useWorkoutStore((s) => s.activeSets);
  const restDuration = useWorkoutStore((s) => s.restDuration);
  const restName = useWorkoutStore((s) => s.restExerciseName);
  const { addExercises, discardSession, skipRest, adjustRest } = useWorkoutStore.getState();
  const unit = useSettingsStore((s) => s.unit);
  const defaultRest = useSettingsStore((s) => s.defaultRest);
  const { loggerOpen, closeLogger, bump, setTab, dataVersion } = useNav();

  const now = useNow(Boolean(session));
  const rest = useRest(now);
  useWakeLock(Boolean(session));

  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map());
  const [picker, setPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [syncRoutine, setSyncRoutine] = useState(true);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const idsKey = activeExercises.map((e) => e.exerciseId).join('|');
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : [];
    db.exercises.bulkGet(ids).then((list) => {
      setExerciseMap(new Map(list.filter((e): e is Exercise => Boolean(e)).map((e) => [e.id, e])));
    });
  }, [idsKey, dataVersion]);

  const supersets = useMemo(() => {
    const groups = [...new Set(activeExercises.map((e) => e.supersetGroupId).filter(Boolean))] as string[];
    return new Map(
      groups.map((g, i) => [
        g,
        { label: `Superset ${String.fromCharCode(65 + (i % 26))}`, color: SUPERSET_COLORS[i % SUPERSET_COLORS.length] },
      ])
    );
  }, [activeExercises]);

  const done = activeSets.filter((s) => s.completed);
  const volume = sessionVolume(activeSets);

  const discard = () => {
    setSaving(false);
    closeLogger();
    discardSession();
  };

  const openSave = () => {
    if (!session) return;
    setTitle(session.routineName ?? '');
    setNotes(session.notes ?? '');
    setSaving(true);
  };

  const save = async () => {
    if (!session) return;
    const completed = done.map((s) => ({ ...s, sessionId: session.id }));
    const order = activeExercises.map((e) => e.exerciseId).filter((id) => completed.some((s) => s.exerciseId === id));
    const records = findRecords(completed, await loadBests(order));
    const finished: WorkoutSession = {
      ...session,
      routineName: title.trim() || session.routineName,
      notes: notes.trim() || undefined,
      finishedAt: Date.now(),
      totalVolume: sessionVolume(completed),
      prCount: records.size,
      exerciseOrder: order,
    };

    await db.transaction('rw', db.workoutSessions, db.sets, async () => {
      await db.workoutSessions.put(finished);
      await db.sets.bulkPut(completed);
    });

    if (session.routineId && syncRoutine) {
      const routine = await db.routines.get(session.routineId);
      if (routine) {
        await db.routines.update(session.routineId, {
          exercises: activeExercises.map((ae) => {
            const old = routine.exercises.find((r) => r.exerciseId === ae.exerciseId);
            return {
              exerciseId: ae.exerciseId,
              sets: activeSets.filter((s) => s.exerciseId === ae.exerciseId && s.type !== 'warmup').length || old?.sets || 3,
              repMin: ae.repMin ?? old?.repMin ?? 8,
              repMax: ae.repMax ?? old?.repMax ?? 12,
              restSeconds: ae.restSeconds,
              notes: ae.notes || '',
            };
          }),
          updatedAt: Date.now(),
        });
      }
    }

    const workoutNumber = await db.workoutSessions.count();
    setSaving(false);
    closeLogger();
    discardSession();
    bump();
    setTab('home');
    buzz([40, 60, 120]);
    setCelebration({ session: finished, sets: completed.length, workoutNumber });
  };

  if (celebration) {
    const s = celebration.session;
    return (
      <div className="sheet-full" style={{ zIndex: 90, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 104, height: 104, marginBottom: 26 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', animation: 'ring 1.8s ease-out infinite' }} />
          <div
            className="avatar"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(140deg, #5AA9FF, #1F6FE0)',
              boxShadow: '0 16px 50px rgba(47,140,255,0.5)',
              animation: 'pop 0.5s ease',
            }}
          >
            <Trophy size={46} color="#fff" />
          </div>
        </div>
        <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' }}>Nice work!</h2>
        <p className="muted" style={{ margin: '8px 0 28px', fontSize: 16 }}>
          That's your {ordinal(celebration.workoutNumber)} workout.
        </p>

        <div className="card" style={{ width: '100%', maxWidth: 380, padding: 18, textAlign: 'left' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{s.routineName}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Stat label="Duration" value={fmtDuration((s.finishedAt ?? s.startedAt) - s.startedAt)} />
            <Stat label="Volume" value={fmtVolume(s.totalVolume, unit)} />
            <Stat label="Sets" value={celebration.sets} />
          </div>
          {Boolean(s.prCount) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 16,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(245,184,61,0.12)',
                color: 'var(--yellow)',
                fontWeight: 650,
              }}
            >
              <Medal size={20} /> {s.prCount} personal record{s.prCount! > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <button className="btn primary block" style={{ maxWidth: 380, height: 52, marginTop: 28 }} onClick={() => setCelebration(null)}>
          Done
        </button>
      </div>
    );
  }

  if (!session || !loggerOpen) return null;

  const elapsed = (now - session.startedAt) / 1000;

  return (
    <div className="sheet-full" style={{ zIndex: 45 }}>
      <div className="topbar" style={{ paddingLeft: 4, paddingRight: 12 }}>
        <button className="icon-btn" onClick={closeLogger} aria-label="Minimise workout">
          <ChevronDown size={26} />
        </button>
        <h1>Log Workout</h1>
        <button className="btn primary sm" onClick={openSave}>
          Finish
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <Stat label="Duration" value={fmtClock(elapsed)} accent />
        <Stat label="Volume" value={fmtVolume(volume, unit)} />
        <Stat label="Sets" value={done.length} />
      </div>

      <div className="scroll">
        {activeExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 28px 28px' }}>
            <div className="avatar" style={{ width: 72, height: 72, margin: '0 auto 18px', background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              <Dumbbell size={32} />
            </div>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Get started</p>
            <p className="dim" style={{ margin: '6px 0 0', fontSize: 15 }}>
              Add an exercise to start your workout
            </p>
          </div>
        ) : (
          activeExercises.map((ae, i) => (
            <div key={ae.exerciseId} style={{ borderBottom: '8px solid var(--surface)', paddingBottom: 10 }}>
              <ExerciseBlock
                info={ae}
                exercise={exerciseMap.get(ae.exerciseId)}
                index={i}
                count={activeExercises.length}
                superset={ae.supersetGroupId ? supersets.get(ae.supersetGroupId) : undefined}
                others={activeExercises
                  .filter((o) => o.exerciseId !== ae.exerciseId)
                  .map((o) => ({ id: o.exerciseId, name: exerciseMap.get(o.exerciseId)?.name ?? 'Exercise', groupId: o.supersetGroupId }))}
              />
            </div>
          ))
        )}

        <div style={{ display: 'grid', gap: 10, padding: '18px 16px 40px' }}>
          <button className="btn primary block" onClick={() => setPicker(true)}>
            <Plus size={19} /> Add Exercise
          </button>
          <button className="btn danger block" onClick={() => setConfirmDiscard(true)}>
            Discard Workout
          </button>
        </div>
      </div>

      {rest > 0 && (
        <div className="rest-bar">
          <div className="progress" style={{ marginBottom: 10 }}>
            <i style={{ width: `${Math.min(100, (rest / restDuration) * 100)}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn sm" onClick={() => adjustRest(-15)}>
              -15
            </button>
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <div className="num" style={{ fontSize: 26, fontWeight: 750, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {fmtClock(rest)}
              </div>
              {restName && (
                <div className="dim" style={{ fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {restName}
                </div>
              )}
            </div>
            <button className="btn sm" onClick={() => adjustRest(15)}>
              +15
            </button>
            <button className="btn primary sm" onClick={skipRest}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── Save screen ─────────────────────────────────────── */}
      {saving && (
        <div className="screen" style={{ zIndex: 47 }}>
          <div className="topbar" style={{ paddingLeft: 4, paddingRight: 12 }}>
            <button className="icon-btn" onClick={() => setSaving(false)} aria-label="Back to workout">
              <ChevronLeft size={26} />
            </button>
            <h1>Save Workout</h1>
            <button className="btn primary sm" disabled={done.length === 0} onClick={save}>
              Save
            </button>
          </div>
          <div className="scroll pad" style={{ paddingTop: 18, paddingBottom: 40 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Workout title"
              style={{
                width: '100%',
                border: 0,
                outline: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 24,
                fontWeight: 750,
                letterSpacing: '-0.02em',
                padding: '4px 0 16px',
              }}
            />
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 16 }}>
              <Stat label="Duration" value={fmtDuration(now - session.startedAt)} accent />
              <Stat label="Volume" value={fmtVolume(volume, unit)} />
              <Stat label="Sets" value={done.length} />
            </div>

            {done.length === 0 && (
              <p style={{ margin: '14px 2px 0', fontSize: 14, color: 'var(--yellow)' }}>
                Tick off at least one set to save this workout.
              </p>
            )}
            {done.length > 0 && done.length < activeSets.length && (
              <p className="dim" style={{ margin: '14px 2px 0', fontSize: 14 }}>
                {activeSets.length - done.length} unticked set{activeSets.length - done.length > 1 ? 's' : ''} won't be saved.
              </p>
            )}

            <div className="dim" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 2px 8px', fontSize: 14 }}>
              <Clock size={15} />
              {new Date(session.startedAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>

            <textarea
              className="field"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did your workout go? Leave some notes here..."
            />

            {session.routineId && (
              <label className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginTop: 14, cursor: 'pointer' }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    display: 'grid',
                    placeItems: 'center',
                    background: syncRoutine ? 'var(--accent)' : 'var(--surface-3)',
                    flexShrink: 0,
                  }}
                >
                  {syncRoutine && <Check size={16} strokeWidth={3} />}
                </span>
                <input type="checkbox" checked={syncRoutine} onChange={(e) => setSyncRoutine(e.target.checked)} style={{ display: 'none' }} />
                <span>
                  <span style={{ display: 'block', fontWeight: 600 }}>Update routine</span>
                  <span className="dim" style={{ fontSize: 13.5 }}>
                    Save added exercises, set counts and rest times back to the routine.
                  </span>
                </span>
              </label>
            )}

            <button className="btn danger block" style={{ marginTop: 24 }} onClick={() => setConfirmDiscard(true)}>
              Discard Workout
            </button>
            <div className="dim" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18, fontSize: 12.5 }}>
              <Weight size={13} /> Stored on this device only
            </div>
          </div>
        </div>
      )}

      {picker && (
        <AddExerciseModal
          exclude={activeExercises.map((e) => e.exerciseId)}
          onSelectMany={(list) => {
            addExercises(list.map((e) => e.id), defaultRest);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
          onCreateNew={() => setCreating(true)}
        />
      )}
      {creating && (
        <CreateExerciseModal
          onCreated={(ex) => {
            addExercises([ex.id], defaultRest);
            bump();
            setCreating(false);
            setPicker(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {confirmDiscard && (
        <ConfirmSheet
          title="Discard workout?"
          message="Everything logged in this workout will be lost."
          confirmLabel="Discard Workout"
          danger
          onConfirm={discard}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  );
}
