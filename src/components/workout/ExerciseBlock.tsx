import { useEffect, useMemo, useState } from 'react';
import {
  EllipsisVertical,
  Timer,
  Plus,
  Check,
  Trash2,
  ArrowUpDown,
  Flame,
  Calculator,
  Link2,
  Gauge,
  Medal,
  ChartColumn,
} from 'lucide-react';
import type { Exercise, SetType, WorkoutSet } from '../../types';
import { useWorkoutStore, type ActiveExerciseInfo } from '../../store/workoutStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNav } from '../../store/navStore';
import { usePreviousSets } from '../../hooks/usePreviousSets';
import { findRecords, loadBests, type Bests } from '../../hooks/useHistory';
import { buzz, primeAudio } from '../../hooks/useWebAudio';
import { digitsToSeconds, fmtNum, fmtRest, fmtTime } from '../../utils/format';
import { ExerciseAvatar, Sheet, SheetItem } from '../ui';
import { PlateCalculatorSheet } from './PlateCalculatorSheet';
import { ProgressiveOverloadBadge } from './ProgressiveOverloadBadge';

const TYPE_META: Record<SetType, { tag: string; label: string; color: string }> = {
  warmup: { tag: 'W', label: 'Warm Up Set', color: 'var(--yellow)' },
  normal: { tag: '', label: 'Normal Set', color: 'var(--text)' },
  failure: { tag: 'F', label: 'Failure Set', color: 'var(--red)' },
  dropset: { tag: 'D', label: 'Drop Set', color: 'var(--accent)' },
};
const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
export const SUPERSET_COLORS = ['#B57BFF', '#FF6B9A', '#F5B83D', '#2FD67B', '#2F8CFF'];

/** Time entry on a number pad: digits fill in from the right, so "130" reads 1:30. */
function TimeInput({ value, placeholder, onChange }: { value?: number; placeholder: string; onChange: (sec: number | undefined) => void }) {
  return (
    <input
      className="set-input"
      type="text"
      inputMode="numeric"
      value={value ? fmtTime(value) : ''}
      placeholder={placeholder}
      onChange={(e) => onChange(digitsToSeconds(e.target.value) || undefined)}
      onFocus={(e) => e.target.select()}
    />
  );
}

interface Props {
  info: ActiveExerciseInfo;
  exercise?: Exercise;
  count: number;
  /** Superset display data, when this exercise is linked. */
  superset?: { label: string; color: string };
  /** Other exercises in the workout, for linking a superset. */
  others: { id: string; name: string; groupId?: string }[];
  onReorder: () => void;
}

export function ExerciseBlock({ info, exercise, count, superset, others, onReorder }: Props) {
  const { exerciseId } = info;
  const unit = useSettingsStore((s) => s.unit);
  const push = useNav((s) => s.push);
  const allSets = useWorkoutStore((s) => s.activeSets);
  const { updateSet, toggleSet, addSet, removeSet, removeExercise } = useWorkoutStore.getState();
  const { insertWarmupRamp, setSupersetGroup, setExerciseNotes, setExerciseRest } = useWorkoutStore.getState();

  const sets = useMemo(() => allSets.filter((s) => s.exerciseId === exerciseId), [allSets, exerciseId]);
  const prevSets = usePreviousSets(exerciseId);

  const [menu, setMenu] = useState(false);
  const [restSheet, setRestSheet] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [typeSheet, setTypeSheet] = useState<WorkoutSet | null>(null);
  const [plateFor, setPlateFor] = useState<{ weight: number; setId?: string } | null>(null);
  const [showRpe, setShowRpe] = useState(false);
  const [bests, setBests] = useState<Map<string, Bests>>(new Map());

  useEffect(() => {
    loadBests([exerciseId]).then(setBests);
  }, [exerciseId]);

  const records = useMemo(() => findRecords(sets, bests), [sets, bests]);
  const maxWeight = Math.max(0, ...sets.map((s) => s.weight));
  const kind = exercise?.trackingType ?? 'WeightReps';
  const single = kind === 'Time';
  const cols = single
    ? '40px minmax(0,1fr) 138px 44px'
    : showRpe
      ? '34px minmax(0,1fr) 62px 54px 46px 40px'
      : '40px minmax(0,1fr) 74px 64px 44px';
  const prevLabel = (p: { weight: number; reps: number; durationSec?: number; distanceKm?: number }) =>
    kind === 'Time'
      ? p.durationSec ? fmtTime(p.durationSec) : '—'
      : kind === 'Distance'
        ? `${p.distanceKm ? fmtNum(p.distanceKm) + 'km' : ''} ${p.durationSec ? fmtTime(p.durationSec) : ''}`.trim() || '—'
        : p.weight ? `${fmtNum(p.weight)}${unit} x ${p.reps}` : `${p.reps} reps`;
  const repHint =
    info.repMin && info.repMax ? (info.repMin === info.repMax ? `${info.repMax}` : `${info.repMin}-${info.repMax}`) : '';

  let ordinal = 0;

  return (
    <section style={{ padding: '14px 0 6px', borderLeft: superset ? `3px solid ${superset.color}` : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px 0 16px' }}>
        <ExerciseAvatar exercise={exercise} size={42} />
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => push({ type: 'exercise', id: exerciseId })}>
          <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--accent)', lineHeight: 1.25 }}>
            {exercise?.name ?? ' '}
          </div>
          {superset && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 700,
                background: `${superset.color}26`,
                color: superset.color,
              }}
            >
              {superset.label}
            </span>
          )}
        </div>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Exercise options">
          <EllipsisVertical size={20} color="var(--text-2)" />
        </button>
      </div>

      {/* Notes */}
      <input
        value={info.notes ?? ''}
        onChange={(e) => setExerciseNotes(exerciseId, e.target.value)}
        placeholder="Add notes here..."
        style={{
          width: '100%',
          padding: '10px 16px 6px',
          border: 0,
          outline: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: 15,
        }}
      />

      {/* Rest timer */}
      <button
        onClick={() => setRestSheet(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px 10px',
          border: 0,
          background: 'none',
          color: info.restSeconds ? 'var(--accent)' : 'var(--text-3)',
          fontSize: 15,
          fontWeight: 550,
          cursor: 'pointer',
        }}
      >
        <Timer size={18} />
        Rest Timer: {fmtRest(info.restSeconds)}
      </button>

      <div style={{ padding: '0 16px' }}>
        <ProgressiveOverloadBadge
          exerciseId={exerciseId}
          repMaxTarget={info.repMax}
          currentWeight={maxWeight}
          onApplyWeight={(w) => {
            const target = sets.find((s) => !s.completed) ?? sets[sets.length - 1];
            if (target) updateSet(target.id, { weight: w });
          }}
          onApplyDeload={(w) => sets.forEach((s) => s.type === 'normal' && !s.completed && updateSet(s.id, { weight: w }))}
        />
      </div>

      {/* Set table */}
      <div className="set-grid set-head" style={{ gridTemplateColumns: cols }}>
        <div>SET</div>
        <div>PREVIOUS</div>
        {single ? (
          <div>TIME</div>
        ) : (
          <>
            <div>{kind === 'Distance' ? 'KM' : kind === 'RepsOnly' ? `+${unit.toUpperCase()}` : unit.toUpperCase()}</div>
            <div>{kind === 'Distance' ? 'TIME' : 'REPS'}</div>
          </>
        )}
        {showRpe && !single && <div>RPE</div>}
        <Check size={15} style={{ justifySelf: 'center' }} />
      </div>

      {sets.map((s, i) => {
        const meta = TYPE_META[s.type];
        const prev = s.type === 'warmup' ? undefined : prevSets[ordinal];
        const label = s.type === 'normal' ? String(++ordinal) : (s.type !== 'warmup' && ++ordinal, meta.tag);
        const record = records.get(s.id);
        // With no history, carry the weight down from the set above.
        const above = sets.slice(0, i).reverse().find((x) => x.weight > 0 && x.type !== 'warmup');
        const hintWeight = prev?.weight ?? (s.type === 'warmup' ? undefined : above?.weight);
        const hintTime = prev?.durationSec ?? (kind === 'Time' ? info.repMax : undefined);
        return (
          <div
            key={s.id}
            className={`set-grid set-row${s.completed ? ' done' : i % 2 ? ' alt' : ''}`}
            style={{ gridTemplateColumns: cols }}
          >
            <button className="set-tag" style={{ color: meta.color }} onClick={() => setTypeSheet(s)}>
              {record ? <Medal size={19} color="var(--yellow)" style={{ margin: '0 auto', display: 'block' }} /> : label}
            </button>

            <button
              className="set-prev num"
              onClick={() =>
                prev &&
                !s.completed &&
                updateSet(s.id, { weight: prev.weight, reps: prev.reps, durationSec: prev.durationSec, distanceKm: prev.distanceKm })
              }
            >
              {prev ? prevLabel(prev) : '—'}
            </button>

            {kind === 'Time' ? (
              <TimeInput value={s.durationSec} placeholder={hintTime ? fmtTime(hintTime) : '0:00'} onChange={(v) => updateSet(s.id, { durationSec: v })} />
            ) : (
              <>
                <input
                  className="set-input"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={(kind === 'Distance' ? s.distanceKm : s.weight) || ''}
                  placeholder={kind === 'Distance' ? (prev?.distanceKm ? fmtNum(prev.distanceKm) : '0') : hintWeight ? fmtNum(hintWeight) : '0'}
                  onChange={(e) => {
                    const v = Math.max(0, parseFloat(e.target.value) || 0);
                    updateSet(s.id, kind === 'Distance' ? { distanceKm: v || undefined } : { weight: v });
                  }}
                  onFocus={(e) => e.target.select()}
                />
                {kind === 'Distance' ? (
                  <TimeInput value={s.durationSec} placeholder={hintTime ? fmtTime(hintTime) : '0:00'} onChange={(v) => updateSet(s.id, { durationSec: v })} />
                ) : (
                  <input
                    className="set-input"
                    type="number"
                    inputMode="numeric"
                    value={s.reps || ''}
                    placeholder={prev ? String(prev.reps) : repHint || '0'}
                    onChange={(e) => updateSet(s.id, { reps: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    onFocus={(e) => e.target.select()}
                  />
                )}
              </>
            )}
            {showRpe && !single && (
              <input
                className="set-input"
                type="number"
                inputMode="decimal"
                step="0.5"
                value={s.rpe || ''}
                placeholder="—"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  updateSet(s.id, { rpe: v ? Math.min(10, Math.max(1, v)) : undefined });
                }}
                onFocus={(e) => e.target.select()}
              />
            )}
            <button
              className={`set-check${s.completed ? ' on' : ''}`}
              aria-label={s.completed ? 'Mark set incomplete' : 'Mark set complete'}
              onClick={(e) => {
                primeAudio();
                if (!s.completed) {
                  buzz(10);
                  // The rest bar is about to take space at the bottom: keep the next row in view.
                  const row = e.currentTarget.parentElement;
                  const next = (row?.nextElementSibling ?? row) as HTMLElement | null;
                  setTimeout(() => {
                    // Scroll only the workout list (scrollIntoView can also shift the whole screen).
                    const scroller = next?.closest('.scroll');
                    if (!next || !scroller) return;
                    const over = next.getBoundingClientRect().bottom + 16 - scroller.getBoundingClientRect().bottom;
                    if (over > 0) scroller.scrollBy({ top: over, behavior: 'smooth' });
                  }, 320);
                }
                toggleSet(
                  s.id,
                  kind === 'Time' || kind === 'Distance'
                    ? { durationSec: hintTime, distanceKm: prev?.distanceKm }
                    : { weight: hintWeight, reps: prev?.reps ?? info.repMax },
                  exercise?.name
                );
              }}
            >
              <Check size={19} strokeWidth={3} />
            </button>
          </div>
        );
      })}

      <div style={{ padding: '10px 16px 0' }}>
        <button className="btn block sm" style={{ height: 38 }} onClick={() => addSet(exerciseId)}>
          <Plus size={17} /> Add Set
        </button>
      </div>

      {/* ── Sheets ─────────────────────────────────────────── */}
      {menu && (
        <Sheet title={exercise?.name} onClose={() => setMenu(false)}>
          {count > 1 && (
            <SheetItem icon={<ArrowUpDown size={20} />} label="Reorder Exercises" onClick={() => (setMenu(false), onReorder())} />
          )}
          <SheetItem
            icon={<ChartColumn size={20} />}
            label="Exercise History"
            onClick={() => (setMenu(false), push({ type: 'exercise', id: exerciseId }))}
          />
          <SheetItem
            icon={<Flame size={20} color="var(--yellow)" />}
            label="Add Warm-Up Sets"
            onClick={() => (insertWarmupRamp(exerciseId, maxWeight || prevSets[0]?.weight || 60), setMenu(false))}
          />
          <SheetItem
            icon={<Calculator size={20} />}
            label="Plate Calculator"
            onClick={() => (setPlateFor({ weight: maxWeight || prevSets[0]?.weight || 60 }), setMenu(false))}
          />
          {info.supersetGroupId ? (
            <SheetItem
              icon={<Link2 size={20} />}
              label="Remove from Superset"
              onClick={() => (setSupersetGroup(exerciseId, undefined), setMenu(false))}
            />
          ) : (
            others.length > 0 && (
              <SheetItem icon={<Link2 size={20} />} label="Add to Superset" onClick={() => (setMenu(false), setLinkSheet(true))} />
            )
          )}
          <SheetItem
            icon={<Gauge size={20} />}
            label={showRpe ? 'Hide RPE' : 'Track RPE'}
            onClick={() => (setShowRpe(!showRpe), setMenu(false))}
          />
          <SheetItem
            danger
            icon={<Trash2 size={20} />}
            label="Remove Exercise"
            onClick={() => (removeExercise(exerciseId), setMenu(false))}
          />
        </Sheet>
      )}

      {restSheet && (
        <Sheet title="Rest Timer" subtitle={exercise?.name} onClose={() => setRestSheet(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 4px' }}>
            {REST_OPTIONS.map((sec) => (
              <button
                key={sec}
                className={`btn ${info.restSeconds === sec ? 'primary' : ''}`}
                onClick={() => (setExerciseRest(exerciseId, sec), setRestSheet(false))}
              >
                {fmtRest(sec)}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {linkSheet && (
        <Sheet title="Superset with" subtitle="Linked exercises are marked with the same colour." onClose={() => setLinkSheet(false)}>
          {others.map((o) => (
            <SheetItem
              key={o.id}
              icon={<Link2 size={20} />}
              label={o.name}
              onClick={() => {
                const group = o.groupId ?? `ss-${Date.now()}`;
                setSupersetGroup(o.id, group);
                setSupersetGroup(exerciseId, group);
                setLinkSheet(false);
              }}
            />
          ))}
        </Sheet>
      )}

      {typeSheet && (
        <Sheet title="Set Type" onClose={() => setTypeSheet(null)}>
          {(['warmup', 'normal', 'failure', 'dropset'] as SetType[]).map((t) => (
            <SheetItem
              key={t}
              icon={
                <span style={{ width: 22, textAlign: 'center', fontWeight: 800, color: TYPE_META[t].color }}>
                  {TYPE_META[t].tag || '1'}
                </span>
              }
              label={TYPE_META[t].label}
              hint={typeSheet.type === t ? <Check size={18} color="var(--accent)" /> : undefined}
              onClick={() => (updateSet(typeSheet.id, { type: t }), setTypeSheet(null))}
            />
          ))}
          {exercise?.category === 'Barbell' && (
            <SheetItem
              icon={<Calculator size={20} />}
              label="Plate Calculator"
              onClick={() => (setPlateFor({ weight: typeSheet.weight || 60, setId: typeSheet.id }), setTypeSheet(null))}
            />
          )}
          <SheetItem danger icon={<Trash2 size={20} />} label="Remove Set" onClick={() => (removeSet(typeSheet.id), setTypeSheet(null))} />
        </Sheet>
      )}

      {plateFor && (
        <PlateCalculatorSheet
          initialWeight={plateFor.weight}
          exerciseName={exercise?.name}
          onApplyWeight={(w) => {
            if (plateFor.setId) updateSet(plateFor.setId, { weight: w });
            else sets.forEach((s) => !s.weight && updateSet(s.id, { weight: w }));
            setPlateFor(null);
          }}
          onApplyWarmupRamp={(w) => (insertWarmupRamp(exerciseId, w), setPlateFor(null))}
          onClose={() => setPlateFor(null)}
        />
      )}
    </section>
  );
}
