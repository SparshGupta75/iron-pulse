import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { Exercise } from '../../types';
import { ExerciseAvatar, Sheet } from '../ui';

const ROW = 60;

/** Drag exercises by their handle to change the workout order. */
export function ReorderSheet({
  items,
  onDone,
  onClose,
}: {
  items: { id: string; exercise?: Exercise }[];
  onDone: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  // Pointer position at which the dragged row sits exactly in its slot.
  const anchor = useRef(0);
  const byId = new Map(items.map((i) => [i.id, i.exercise]));

  const move = (clientY: number) => {
    if (!dragId) return;
    const dy = clientY - anchor.current;
    const from = order.indexOf(dragId);
    const to = Math.max(0, Math.min(order.length - 1, from + Math.round(dy / ROW)));
    if (to !== from) {
      const next = [...order];
      next.splice(to, 0, next.splice(from, 1)[0]);
      setOrder(next);
      anchor.current += (to - from) * ROW;
      setOffset(clientY - anchor.current);
    } else {
      setOffset(dy);
    }
  };
  const drop = () => {
    setDragId(null);
    setOffset(0);
  };

  return (
    <Sheet title="Reorder Exercises" subtitle="Drag the handle to move an exercise." onClose={onClose}>
      <div style={{ userSelect: 'none' }}>
        {order.map((id) => {
          const ex = byId.get(id);
          const dragging = dragId === id;
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: ROW,
                padding: '0 6px 0 10px',
                borderRadius: 12,
                position: 'relative',
                zIndex: dragging ? 2 : 1,
                background: dragging ? 'var(--surface-3)' : 'transparent',
                boxShadow: dragging ? '0 10px 30px rgba(0,0,0,0.5)' : undefined,
                transform: dragging ? `translateY(${offset}px) scale(1.02)` : undefined,
                transition: dragging ? undefined : 'transform 0.15s',
              }}
            >
              <ExerciseAvatar exercise={ex} size={40} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ex?.name ?? 'Exercise'}
              </span>
              <div
                role="button"
                aria-label={`Drag ${ex?.name ?? 'exercise'}`}
                style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', touchAction: 'none', cursor: 'grab', color: 'var(--text-3)' }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  anchor.current = e.clientY;
                  setDragId(id);
                }}
                onPointerMove={(e) => move(e.clientY)}
                onPointerUp={drop}
                onPointerCancel={drop}
              >
                <GripVertical size={22} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 4px 0' }}>
        <button className="btn primary block" onClick={() => onDone(order)}>
          Done
        </button>
      </div>
    </Sheet>
  );
}
