import { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  initialWeight: number;
  exerciseName?: string;
  onApplyWeight?: (weight: number) => void;
  onApplyWarmupRamp?: (targetWeight: number) => void;
  onClose: () => void;
}

export function PlateCalculatorSheet({
  initialWeight,
  exerciseName,
  onApplyWeight,
  onApplyWarmupRamp,
  onClose,
}: Props) {
  const { unit, barbellWeight: defaultBarbellWeight, availablePlates } = useSettingsStore();
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight > 0 ? initialWeight : 60);
  const [barbellWeight, setBarbellWeight] = useState<number>(defaultBarbellWeight);

  // Plate calculation per side
  const weightToDistribute = Math.max(0, targetWeight - barbellWeight);
  const perSide = weightToDistribute / 2;

  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  let remainder = perSide;
  const plateCountMap: { plate: number; count: number }[] = [];

  for (const plate of sortedPlates) {
    if (remainder >= plate) {
      const count = Math.floor(remainder / plate);
      plateCountMap.push({ plate, count });
      remainder = Math.round((remainder - count * plate) * 100) / 100;
    }
  }

  const getPlateColor = (weight: number): { bg: string; text: string; height: number } => {
    if (unit === 'kg') {
      if (weight >= 25) return { bg: '#DC2626', text: '#FFFFFF', height: 90 };
      if (weight >= 20) return { bg: '#1F74E0', text: '#FFFFFF', height: 86 };
      if (weight >= 15) return { bg: '#CA8A04', text: '#FFFFFF', height: 78 };
      if (weight >= 10) return { bg: '#16A34A', text: '#FFFFFF', height: 70 };
      if (weight >= 5) return { bg: '#D4D4D8', text: '#141416', height: 60 };
      if (weight >= 2.5) return { bg: '#475569', text: '#FFFFFF', height: 50 };
      return { bg: '#94A3B8', text: '#141416', height: 42 };
    } else {
      if (weight >= 45) return { bg: '#1F74E0', text: '#FFFFFF', height: 90 };
      if (weight >= 35) return { bg: '#CA8A04', text: '#FFFFFF', height: 82 };
      if (weight >= 25) return { bg: '#16A34A', text: '#FFFFFF', height: 74 };
      if (weight >= 10) return { bg: '#D4D4D8', text: '#141416', height: 64 };
      if (weight >= 5) return { bg: '#475569', text: '#FFFFFF', height: 52 };
      return { bg: '#94A3B8', text: '#141416', height: 42 };
    }
  };

  const handleAdjust = (delta: number) => {
    setTargetWeight((prev) => Math.max(barbellWeight, prev + delta));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#141416',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          border: '1px solid #232327',
          padding: '20px 20px 28px',
          color: '#FAFAFA',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle / Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Barbell Plate Math</h3>
            {exerciseName && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A1A1AA' }}>{exerciseName}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#232327',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A1A1AA',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Weight Controls */}
        <div
          style={{
            backgroundColor: '#000000',
            borderRadius: 14,
            padding: 16,
            border: '1px solid #232327',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleAdjust(-5)}
              style={{
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              -5
            </button>
            <button
              onClick={() => handleAdjust(-2.5)}
              style={{
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              -2.5
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#2F8CFF', fontVariantNumeric: 'tabular-nums' }}>
              {targetWeight} <span style={{ fontSize: 16, color: '#A1A1AA' }}>{unit}</span>
            </div>
            <div style={{ fontSize: 11, color: '#7C7C87' }}>
              {perSide.toFixed(2)} {unit} per side
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleAdjust(2.5)}
              style={{
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              +2.5
            </button>
            <button
              onClick={() => handleAdjust(5)}
              style={{
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              +5
            </button>
          </div>
        </div>

        {/* Barbell Weight Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>Barbell Weight:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[20, 15, 10].map((w) => (
              <button
                key={w}
                onClick={() => setBarbellWeight(w)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: barbellWeight === w ? '1px solid #2F8CFF' : '1px solid #232327',
                  backgroundColor: barbellWeight === w ? 'rgba(47,140,255,0.15)' : '#141416',
                  color: barbellWeight === w ? '#2F8CFF' : '#A1A1AA',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {w} {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Barbell Graphic */}
        <div
          style={{
            backgroundColor: '#000000',
            borderRadius: 14,
            padding: '24px 12px',
            border: '1px solid #232327',
            marginBottom: 20,
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 110,
              position: 'relative',
            }}
          >
            {/* Center Bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 14,
                backgroundColor: '#52525B',
                borderRadius: 4,
                zIndex: 1,
              }}
            />

            {/* Collar/Sleeve */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 12px',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 48,
                  backgroundColor: '#7C7C87',
                  borderRadius: 3,
                  marginRight: 6,
                  border: '1px solid #34343A',
                }}
              />

              {plateCountMap.flatMap(({ plate, count }, pIdx) =>
                Array.from({ length: count }).map((_, cIdx) => {
                  const style = getPlateColor(plate);
                  return (
                    <div
                      key={`${pIdx}-${cIdx}`}
                      style={{
                        width: 22,
                        height: style.height,
                        backgroundColor: style.bg,
                        color: style.text,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 800,
                        writingMode: 'vertical-rl',
                        textOrientation: 'upright',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {plate}
                    </div>
                  );
                })
              )}

              {plateCountMap.length === 0 && (
                <div style={{ color: '#7C7C87', fontSize: 13, zIndex: 2, padding: '0 20px' }}>
                  Empty Bar ({barbellWeight} {unit})
                </div>
              )}
            </div>
          </div>

          {/* Breakdown summary */}
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: '#A1A1AA' }}>
            {plateCountMap.length > 0 ? (
              <span>
                Each side:{' '}
                {plateCountMap
                  .map(({ plate, count }) => `${count}×${plate} ${unit}`)
                  .join(' + ')}
              </span>
            ) : (
              <span>Just the bar!</span>
            )}
            {remainder > 0 && (
              <div style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                Remaining weight: {(remainder * 2).toFixed(2)} {unit} cannot be loaded with available plates
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {onApplyWeight && (
            <button
              onClick={() => {
                onApplyWeight(targetWeight);
                onClose();
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 12,
                backgroundColor: '#2F8CFF',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Check size={18} strokeWidth={2.5} />
              Set Weight to {targetWeight} {unit}
            </button>
          )}

          {onApplyWarmupRamp && (
            <button
              onClick={() => {
                onApplyWarmupRamp(targetWeight);
                onClose();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                backgroundColor: 'rgba(245,158,11,0.15)',
                border: '1px solid #F59E0B',
                color: '#F59E0B',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={16} />
              1-Click Warm-Up Ramp ({targetWeight} {unit})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
