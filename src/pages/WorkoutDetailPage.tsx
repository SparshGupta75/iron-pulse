import { useEffect, useMemo, useState } from 'react';
import { Ellipsis, Medal, Repeat, ClipboardList, Trash2, Pencil, Share2, Plus, X } from 'lucide-react';
import { db } from '../db/db';
import type { Routine, SetType, WorkoutSet } from '../types';
import { findRecords, groupByExercise, loadBests, useHistory, type Bests } from '../hooks/useHistory';
import { useNav } from '../store/navStore';
import { useSettingsStore } from '../store/settingsStore';
import { digitsToSeconds, fmtDuration, fmtSet, fmtTime, fmtVolume, relDate, sessionVolume, uid } from '../utils/format';
import { shareWorkoutCard } from '../utils/shareCard';
import { BackBar, ConfirmSheet, ExerciseAvatar, Sheet, SheetItem, Stat } from '../components/ui';
import { useStartWorkout } from './WorkoutTab';

const TAG: Record<SetType, { tag: string; color: string }> = {
  normal: { tag: '', color: 'var(--text)' },
  warmup: { tag: 'W', color: 'var(--yellow)' },
  failure: { tag: 'F', color: 'var(--red)' },
  dropset: { tag: 'D', color: 'var(--accent)' },
};

interface Draft {
  title: string;
  notes: string;
  /** Local "YYYY-MM-DDTHH:mm" for the datetime input. */
  start: string;
  minutes: string;
  sets: WorkoutSet[];
}

const toLocalInput = (ts: number) => {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

export default function WorkoutDetailPage({ id }: { id: string }) {
  const history = useHistory();
  const { back, push, bump } = useNav();
  const unit = useSettingsStore((s) => s.unit);
  const name = useSettingsStore((s) => s.profileName);
  const defaultRest = useSettingsStore((s) => s.defaultRest);
  const { start, dialog } = useStartWorkout();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bests, setBests] = useState<Map<string, Bests>>(new Map());

  const session = history.sessions.find((s) => s.id === id);
  const saved = useMemo(() => history.setsBySession.get(id) ?? [], [history, id]);
  const sets = draft ? draft.sets : saved;
  const groups = useMemo(() => groupByExercise(sets, session?.exerciseOrder), [sets, session]);
  const idsKey = groups.map((g) => g.exerciseId).join('|');

  useEffect(() => {
    if (idsKey) loadBests(idsKey.split('|'), id).then(setBests);
  }, [idsKey, id]);
  const records = useMemo(() => findRecords(sets, bests), [sets, bests]);

  if (!session) return <BackBar title="Workout" />;

  const asRoutine = (): Routine => ({
    id: `routine-${Date.now()}`,
    name: session.routineName || 'Workout',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    exercises: groups.map((g) => {
      const working = g.sets.filter((s) => s.type !== 'warmup');
      const reps = working.map((s) => s.reps).filter(Boolean);
      return {
        exerciseId: g.exerciseId,
        sets: working.length || 1,
        repMin: reps.length ? Math.min(...reps) : 8,
        repMax: reps.length ? Math.max(...reps) : 12,
        restSeconds: defaultRest,
      };
    }),
  });

  const beginEdit = () =>
    setDraft({
      title: session.routineName ?? '',
      notes: session.notes ?? '',
      start: toLocalInput(session.startedAt),
      minutes: String(Math.max(1, Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 60000))),
      sets: saved.map((s) => ({ ...s })),
    });

  const patchSet = (setId: string, patch: Partial<WorkoutSet>) =>
    setDraft((d) => d && { ...d, sets: d.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) });

  const addSet = (exerciseId: string, after: WorkoutSet[]) => {
    const last = after[after.length - 1];
    setDraft(
      (d) =>
        d && {
          ...d,
          sets: [
            ...d.sets,
            {
              ...last,
              id: uid(),
              sessionId: id,
              exerciseId,
              setNumber: (last?.setNumber ?? 0) + 1,
              type: 'normal',
              completed: true,
              timestamp: (last?.timestamp ?? session.startedAt) + 1,
            },
          ],
        }
    );
  };

  const saveEdit = async () => {
    if (!draft) return;
    const startedAt = new Date(draft.start).getTime() || session.startedAt;
    const minutes = Math.max(1, parseInt(draft.minutes, 10) || 1);
    // Renumber each exercise's sets 1..n in their current order.
    const finalSets = groupByExercise(draft.sets, session.exerciseOrder).flatMap((g) =>
      g.sets.map((s, i) => ({ ...s, setNumber: i + 1 }))
    );
    const keep = new Set(finalSets.map((s) => s.id));
    await db.transaction('rw', db.workoutSessions, db.sets, async () => {
      await db.sets.bulkDelete(saved.filter((s) => !keep.has(s.id)).map((s) => s.id));
      await db.sets.bulkPut(finalSets);
      await db.workoutSessions.update(id, {
        routineName: draft.title.trim() || session.routineName,
        notes: draft.notes.trim() || undefined,
        startedAt,
        finishedAt: startedAt + minutes * 60000,
        totalVolume: sessionVolume(finalSets),
        prCount: findRecords(finalSets, bests).size,
      });
    });
    setDraft(null);
    bump();
  };

  return (
    <>
      <BackBar
        title={draft ? 'Edit Workout' : 'Workout Detail'}
        right={
          draft ? (
            <>
              <button className="btn ghost sm" style={{ color: 'var(--text-2)' }} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button className="btn primary sm" style={{ marginRight: 6 }} disabled={draft.sets.length === 0} onClick={saveEdit}>
                Save
              </button>
            </>
          ) : (
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Workout options">
              <Ellipsis size={22} />
            </button>
          )
        }
      />
      <div className="scroll">
        <div className="pad" style={{ paddingTop: 18, paddingBottom: 16, borderBottom: '8px solid var(--surface)' }}>
          {draft ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <input className="field" value={draft.title} placeholder="Workout title" onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ fontWeight: 700, fontSize: 18 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px', gap: 10 }}>
                <label className="dim" style={{ fontSize: 12.5 }}>
                  Started
                  <input className="field" type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} style={{ marginTop: 4, fontSize: 15 }} />
                </label>
                <label className="dim" style={{ fontSize: 12.5 }}>
                  Minutes
                  <input className="field" type="number" inputMode="numeric" value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} style={{ marginTop: 4 }} />
                </label>
              </div>
              <textarea className="field" rows={3} value={draft.notes} placeholder="Notes" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          ) : (
            <>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{session.routineName || 'Workout'}</h2>
              <div className="dim" style={{ marginTop: 4, fontSize: 14 }}>
                {relDate(session.startedAt)}
              </div>
              {session.notes && (
                <p className="muted" style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.45 }}>
                  {session.notes}
                </p>
              )}
              <div style={{ display: 'flex', gap: 28, marginTop: 16 }}>
                <Stat label="Time" value={fmtDuration((session.finishedAt ?? session.startedAt) - session.startedAt)} />
                <Stat label="Volume" value={fmtVolume(session.totalVolume, unit)} />
                <Stat label="Sets" value={sets.length} />
                {records.size > 0 && (
                  <Stat
                    label="Records"
                    value={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--yellow)' }}>
                        <Medal size={16} /> {records.size}
                      </span>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>

        {groups.map((g) => {
          const ex = history.exercises.get(g.exerciseId);
          const kind = ex?.trackingType ?? 'WeightReps';
          let n = 0;
          return (
            <section key={g.exerciseId} style={{ padding: '16px 0 12px', borderBottom: '1px solid var(--line)' }}>
              <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }} onClick={() => !draft && push({ type: 'exercise', id: g.exerciseId })}>
                <ExerciseAvatar exercise={ex} size={40} />
                <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--accent)' }}>{ex?.name ?? 'Exercise'}</div>
              </div>
              {!draft && (
                <div className="set-grid set-head" style={{ gridTemplateColumns: '44px 1fr', textAlign: 'left' }}>
                  <div style={{ textAlign: 'center' }}>SET</div>
                  <div>{kind === 'Time' ? 'TIME' : kind === 'Distance' ? 'DISTANCE & TIME' : 'WEIGHT & REPS'}</div>
                </div>
              )}
              {g.sets.map((s, i) => {
                const t = TAG[s.type];
                if (s.type !== 'warmup') n++;
                const record = records.get(s.id);
                if (draft) {
                  const time = (
                    <input
                      className="set-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="0:00"
                      value={s.durationSec ? fmtTime(s.durationSec) : ''}
                      onChange={(e) => patchSet(s.id, { durationSec: digitsToSeconds(e.target.value) || undefined })}
                    />
                  );
                  return (
                    <div key={s.id} className="set-grid set-row" style={{ gridTemplateColumns: '40px 1fr 1fr 40px' }}>
                      <div style={{ textAlign: 'center', fontWeight: 750, color: t.color }}>{t.tag || n}</div>
                      {kind === 'Time' ? (
                        <div style={{ gridColumn: 'span 2' }}>{time}</div>
                      ) : (
                        <>
                          <input
                            className="set-input"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder={kind === 'Distance' ? 'km' : unit}
                            value={(kind === 'Distance' ? s.distanceKm : s.weight) || ''}
                            onChange={(e) => {
                              const v = Math.max(0, parseFloat(e.target.value) || 0);
                              patchSet(s.id, kind === 'Distance' ? { distanceKm: v || undefined } : { weight: v });
                            }}
                          />
                          {kind === 'Distance' ? (
                            time
                          ) : (
                            <input
                              className="set-input"
                              type="number"
                              inputMode="numeric"
                              placeholder="reps"
                              value={s.reps || ''}
                              onChange={(e) => patchSet(s.id, { reps: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            />
                          )}
                        </>
                      )}
                      <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Remove set" onClick={() => setDraft({ ...draft, sets: draft.sets.filter((x) => x.id !== s.id) })}>
                        <X size={18} color="var(--red)" />
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={s.id} className={`set-grid set-row${i % 2 ? '' : ' alt'}`} style={{ gridTemplateColumns: '44px 1fr auto', minHeight: 40 }}>
                    <div style={{ textAlign: 'center', fontWeight: 750, color: t.color }}>{t.tag || n}</div>
                    <div className="num" style={{ fontSize: 16 }}>
                      {fmtSet(s, kind, unit)}
                      {s.rpe ? <span className="dim"> · RPE {s.rpe}</span> : null}
                    </div>
                    {record && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(245,184,61,0.14)', color: 'var(--yellow)' }}>
                        <Medal size={13} /> {record}
                      </span>
                    )}
                  </div>
                );
              })}
              {draft && (
                <div style={{ padding: '8px 16px 0' }}>
                  <button className="btn block sm" onClick={() => addSet(g.exerciseId, g.sets)}>
                    <Plus size={16} /> Add Set
                  </button>
                </div>
              )}
            </section>
          );
        })}
        <div style={{ height: 40 }} />
      </div>

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <SheetItem icon={<Pencil size={20} />} label="Edit Workout" onClick={() => (setMenu(false), beginEdit())} />
          <SheetItem
            icon={<Share2 size={20} />}
            label="Share Workout"
            onClick={() => (setMenu(false), shareWorkoutCard({ session, groups, exercises: history.exercises, unit, name }))}
          />
          <SheetItem icon={<Repeat size={20} />} label="Do This Workout Again" onClick={() => (setMenu(false), start(asRoutine()))} />
          <SheetItem
            icon={<ClipboardList size={20} />}
            label="Save as Routine"
            onClick={async () => {
              setMenu(false);
              await db.routines.put(asRoutine());
              bump();
            }}
          />
          <SheetItem danger icon={<Trash2 size={20} />} label="Delete Workout" onClick={() => (setMenu(false), setDeleting(true))} />
        </Sheet>
      )}
      {deleting && (
        <ConfirmSheet
          title="Delete workout?"
          message="This workout and its sets will be permanently removed."
          confirmLabel="Delete Workout"
          danger
          onConfirm={async () => {
            await db.transaction('rw', db.workoutSessions, db.sets, async () => {
              await db.sets.where('sessionId').equals(id).delete();
              await db.workoutSessions.delete(id);
            });
            back();
            bump();
          }}
          onClose={() => setDeleting(false)}
        />
      )}
      {dialog}
    </>
  );
}
