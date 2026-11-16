import { useEffect, useMemo, useState } from 'react';
import { Ellipsis, Medal, Repeat, ClipboardList, Trash2 } from 'lucide-react';
import { db } from '../db/db';
import type { Routine, SetType } from '../types';
import { findRecords, groupByExercise, loadBests, useHistory, type Bests } from '../hooks/useHistory';
import { useNav } from '../store/navStore';
import { useSettingsStore } from '../store/settingsStore';
import { fmtDuration, fmtNum, fmtVolume, relDate } from '../utils/format';
import { BackBar, ConfirmSheet, ExerciseAvatar, Sheet, SheetItem, Stat } from '../components/ui';
import { useStartWorkout } from './WorkoutTab';

const TAG: Record<SetType, { tag: string; color: string }> = {
  normal: { tag: '', color: 'var(--text)' },
  warmup: { tag: 'W', color: 'var(--yellow)' },
  failure: { tag: 'F', color: 'var(--red)' },
  dropset: { tag: 'D', color: 'var(--accent)' },
};

export default function WorkoutDetailPage({ id }: { id: string }) {
  const history = useHistory();
  const { back, push, bump } = useNav();
  const unit = useSettingsStore((s) => s.unit);
  const defaultRest = useSettingsStore((s) => s.defaultRest);
  const { start, dialog } = useStartWorkout();
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bests, setBests] = useState<Map<string, Bests>>(new Map());

  const session = history.sessions.find((s) => s.id === id);
  const sets = useMemo(() => history.setsBySession.get(id) ?? [], [history, id]);
  const groups = useMemo(() => groupByExercise(sets, session?.exerciseOrder), [sets, session]);
  const idsKey = groups.map((g) => g.exerciseId).join('|');

  useEffect(() => {
    if (idsKey) loadBests(idsKey.split('|'), id).then(setBests);
  }, [idsKey, id]);
  const records = useMemo(() => findRecords(sets, bests), [sets, bests]);

  if (!session) return <div className="screen" style={{ zIndex: 30 }}><BackBar title="Workout" /></div>;

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

  return (
    <>
      <BackBar
        title="Workout Detail"
        right={
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Workout options">
            <Ellipsis size={22} />
          </button>
        }
      />
      <div className="scroll">
        <div className="pad" style={{ paddingTop: 18, paddingBottom: 16, borderBottom: '8px solid var(--surface)' }}>
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
        </div>

        {groups.map((g) => {
          const ex = history.exercises.get(g.exerciseId);
          let n = 0;
          return (
            <section key={g.exerciseId} style={{ padding: '16px 0 12px', borderBottom: '1px solid var(--line)' }}>
              <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }} onClick={() => push({ type: 'exercise', id: g.exerciseId })}>
                <ExerciseAvatar exercise={ex} size={40} />
                <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--accent)' }}>{ex?.name ?? 'Exercise'}</div>
              </div>
              <div className="set-grid set-head" style={{ gridTemplateColumns: '44px 1fr', textAlign: 'left' }}>
                <div style={{ textAlign: 'center' }}>SET</div>
                <div>WEIGHT &amp; REPS</div>
              </div>
              {g.sets.map((s, i) => {
                const t = TAG[s.type];
                if (s.type !== 'warmup') n++;
                const record = records.get(s.id);
                return (
                  <div key={s.id} className={`set-grid set-row${i % 2 ? '' : ' alt'}`} style={{ gridTemplateColumns: '44px 1fr auto', minHeight: 40 }}>
                    <div style={{ textAlign: 'center', fontWeight: 750, color: t.color }}>{t.tag || n}</div>
                    <div className="num" style={{ fontSize: 16 }}>
                      {s.weight ? `${fmtNum(s.weight)} ${unit} x ${s.reps}` : `${s.reps} reps`}
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
            </section>
          );
        })}
        <div style={{ height: 40 }} />
      </div>

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
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
