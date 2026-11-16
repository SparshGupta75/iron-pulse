import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, Dumbbell, PersonStanding, Cable, Cog, HeartPulse } from 'lucide-react';
import type { Exercise, EquipmentCategory } from '../types';
import { muscleColor } from '../utils/format';
import { useNav } from '../store/navStore';
import { EXERCISE_MEDIA } from '../db/exerciseMedia';

/** Bottom sheet with a dimmed backdrop. Tap outside to dismiss. */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <p className="sheet-title">{title}</p>}
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function SheetItem({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  hint?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`sheet-item${danger ? ' danger' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {hint != null && <span className="hint">{hint}</span>}
    </button>
  );
}

/** Two-button confirmation presented as a bottom sheet. */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} subtitle={message} onClose={onClose}>
      <div style={{ display: 'grid', gap: 8, padding: '4px 4px 0' }}>
        <button
          className={`btn block ${danger ? 'danger' : 'primary'}`}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn block" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}

const CATEGORY_ICON: Record<EquipmentCategory, typeof Dumbbell> = {
  Barbell: Dumbbell,
  Dumbbell: Dumbbell,
  Cable: Cable,
  Machine: Cog,
  Bodyweight: PersonStanding,
  Cardio: HeartPulse,
};

const mediaUrl = (exerciseId: string, frame: 0 | 1): string | null => {
  const set = EXERCISE_MEDIA[exerciseId];
  return set ? `${import.meta.env.BASE_URL}exercises/${set}-${frame}.webp` : null;
};

/** Exercise thumbnail: a photo when we have one, otherwise a muscle-tinted icon badge. */
export function ExerciseAvatar({ exercise, size = 44 }: { exercise?: Exercise | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const color = muscleColor(exercise?.primaryMuscles[0]);
  const src = exercise && !failed ? mediaUrl(exercise.id, 0) : null;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      />
    );
  }
  const Icon = exercise ? CATEGORY_ICON[exercise.category] ?? Dumbbell : Dumbbell;
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: `${color}22`, color, border: `1px solid ${color}33` }}
    >
      <Icon size={size * 0.46} strokeWidth={2.1} />
    </div>
  );
}

/** Large start/end photos that cross-fade like a looping demo. Renders nothing without photos. */
export function ExerciseDemo({ exerciseId }: { exerciseId: string }) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f ? 0 : 1)), 1100);
    return () => clearInterval(id);
  }, []);
  const a = mediaUrl(exerciseId, 0);
  const b = mediaUrl(exerciseId, 1);
  if (!a || !b || failed) return null;
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      {[a, b].map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: frame === i ? 1 : 0, transition: 'opacity 0.35s ease' }}
        />
      ))}
    </div>
  );
}

/** Small dialog anchored near the top so the on-screen keyboard never covers it. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" style={{ alignItems: 'flex-start', justifyContent: 'center', padding: '14vh 20px 0' }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 18, animation: 'pop 0.2s ease' }} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>{title}</p>
        {children}
      </div>
    </div>
  );
}

/** Slim header with a back chevron for pushed screens. */
export function BackBar({ title, right }: { title?: string; right?: ReactNode }) {
  const back = useNav((s) => s.back);
  return (
    <div className="topbar" style={{ paddingLeft: 4 }}>
      <button className="icon-btn" onClick={back} aria-label="Back">
        <ChevronLeft size={26} />
      </button>
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="dim" style={{ fontSize: 12.5, marginBottom: 2 }}>
        {label}
      </div>
      <div
        className="num"
        style={{ fontSize: 17, fontWeight: 650, color: accent ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap' }}
      >
        {value}
      </div>
    </div>
  );
}
