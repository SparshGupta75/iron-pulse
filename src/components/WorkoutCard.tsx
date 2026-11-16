import { Medal } from 'lucide-react';
import type { WorkoutSession } from '../types';
import { groupByExercise, type HistoryData } from '../hooks/useHistory';
import { useSettingsStore } from '../store/settingsStore';
import { useNav } from '../store/navStore';
import { fmtDuration, fmtVolume, relDate } from '../utils/format';
import { ExerciseAvatar, Stat } from './ui';

/** Feed card summarising one finished workout. */
export function WorkoutCard({ session, history }: { session: WorkoutSession; history: HistoryData }) {
  const unit = useSettingsStore((s) => s.unit);
  const name = useSettingsStore((s) => s.profileName);
  const push = useNav((s) => s.push);
  const groups = groupByExercise(history.setsBySession.get(session.id) ?? [], session.exerciseOrder);
  const shown = groups.slice(0, 3);

  return (
    <article className="card tappable" style={{ padding: 16 }} onClick={() => push({ type: 'workout', id: session.id })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className="avatar" style={{ width: 38, height: 38, background: 'linear-gradient(140deg,#5AA9FF,#1F6FE0)', fontSize: 16 }}>
          {(name.trim()[0] ?? 'A').toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>{name}</div>
          <div className="dim" style={{ fontSize: 13 }}>
            {relDate(session.startedAt)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-0.015em' }}>{session.routineName || 'Workout'}</div>
      {session.notes && (
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.4 }}>
          {session.notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: 28, margin: '14px 0' }}>
        <Stat label="Time" value={fmtDuration((session.finishedAt ?? session.startedAt) - session.startedAt)} />
        <Stat label="Volume" value={fmtVolume(session.totalVolume, unit)} />
        {Boolean(session.prCount) && (
          <Stat
            label="Records"
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--yellow)' }}>
                <Medal size={16} /> {session.prCount}
              </span>
            }
          />
        )}
      </div>

      {shown.length > 0 && (
        <div style={{ display: 'grid', gap: 10, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {shown.map((g) => {
            const ex = history.exercises.get(g.exerciseId);
            return (
              <div key={g.exerciseId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ExerciseAvatar exercise={ex} size={36} />
                <div style={{ fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 650 }}>
                    {g.sets.length} set{g.sets.length > 1 ? 's' : ''}
                  </span>{' '}
                  <span className="muted">{ex?.name ?? 'Exercise'}</span>
                </div>
              </div>
            );
          })}
          {groups.length > shown.length && (
            <div className="dim" style={{ fontSize: 14, textAlign: 'center', paddingTop: 2 }}>
              See {groups.length - shown.length} more exercise{groups.length - shown.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
