import type { ReactNode } from 'react';
import { ChevronLeft, Dumbbell, PersonStanding, Cable, Cog, HeartPulse } from 'lucide-react';
import type { Exercise, EquipmentCategory } from '../types';
import { muscleColor } from '../utils/format';
import { useNav } from '../store/navStore';

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

/** Round, muscle-tinted badge that stands in for an exercise thumbnail. */
export function ExerciseAvatar({ exercise, size = 44 }: { exercise?: Exercise | null; size?: number }) {
  const color = muscleColor(exercise?.primaryMuscles[0]);
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
