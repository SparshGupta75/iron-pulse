import { useState } from 'react';
import type { MuscleGroup } from '../../types';

interface MuscleData {
  sets: number;
  lastTrainedHoursAgo: number | null; // hours elapsed
  recoveryPercent: number; // 0-100%
  exercises: string[];
}

interface Props {
  muscleStats: Record<MuscleGroup, MuscleData>;
  onSelectMuscle?: (muscle: MuscleGroup) => void;
}

export function MuscleHeatmap({ muscleStats, onSelectMuscle }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>('Chest');

  const getColor = (sets: number): string => {
    if (sets === 0) return '#232327';
    if (sets < 6) return '#2F8CFF'; // Low / Maintenance
    if (sets <= 16) return '#2FD67B'; // Optimal hypertrophy
    if (sets <= 22) return '#8B5CF6'; // High stimulus
    return '#F59E0B'; // High fatigue / overreaching
  };

  const handleMuscleClick = (m: MuscleGroup) => {
    setSelectedMuscle(m);
    if (onSelectMuscle) onSelectMuscle(m);
  };

  const selectedData = selectedMuscle ? muscleStats[selectedMuscle] : null;

  return (
    <div
      style={{
        backgroundColor: '#141416',
        borderRadius: 18,
        padding: '18px 16px',
        border: '1px solid #232327',
      }}
    >
      {/* View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FAFAFA' }}>
            Muscle Anatomy & Recovery
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7C7C87' }}>
            Weekly working sets & recovery readiness
          </p>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#000000', borderRadius: 8, padding: 3, border: '1px solid #232327' }}>
          <button
            onClick={() => setView('front')}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: view === 'front' ? '#2F8CFF' : 'transparent',
              color: view === 'front' ? '#FAFAFA' : '#7C7C87',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: view === 'back' ? '#2F8CFF' : 'transparent',
              color: view === 'back' ? '#FAFAFA' : '#7C7C87',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* SVG Canvas & Muscle details layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* SVG Anatomy Visualizer */}
        <div
          style={{
            flex: '1 1 200px',
            minHeight: 280,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000000',
            borderRadius: 14,
            border: '1px solid #232327',
            padding: 12,
          }}
        >
          <svg viewBox="0 0 200 340" width="180" height="306" style={{ overflow: 'visible' }}>
            {/* Silhouette Outline */}
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Head */}
            <circle cx="100" cy="24" r="14" fill="#34343A" />
            <path d="M 94 38 L 106 38 L 108 48 L 92 48 Z" fill="#34343A" />

            {view === 'front' ? (
              /* ── FRONT VIEW MUSCLES ─────────────────────────── */
              <g id="front-muscles">
                {/* Traps (Front) */}
                <path
                  d="M 92 46 L 108 46 L 118 58 L 82 58 Z"
                  fill={getColor(muscleStats['Traps']?.sets || 0)}
                  stroke={selectedMuscle === 'Traps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Traps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Traps')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Front Delts Left & Right */}
                <path
                  d="M 72 56 Q 66 68 70 80 Q 78 78 80 62 Z"
                  fill={getColor(muscleStats['Front Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Front Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Front Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Front Delts')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 128 56 Q 134 68 130 80 Q 122 78 120 62 Z"
                  fill={getColor(muscleStats['Front Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Front Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Front Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Front Delts')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Side Delts */}
                <path
                  d="M 64 64 Q 60 76 66 86 Q 70 78 68 66 Z"
                  fill={getColor(muscleStats['Side Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Side Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Side Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Side Delts')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 136 64 Q 140 76 134 86 Q 130 78 132 66 Z"
                  fill={getColor(muscleStats['Side Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Side Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Side Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Side Delts')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Chest Left & Right Pecs */}
                <path
                  d="M 82 60 Q 98 62 98 88 Q 80 92 74 76 Z"
                  fill={getColor(muscleStats['Chest']?.sets || 0)}
                  stroke={selectedMuscle === 'Chest' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Chest' ? 2 : 1}
                  onClick={() => handleMuscleClick('Chest')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 118 60 Q 102 62 102 88 Q 120 92 126 76 Z"
                  fill={getColor(muscleStats['Chest']?.sets || 0)}
                  stroke={selectedMuscle === 'Chest' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Chest' ? 2 : 1}
                  onClick={() => handleMuscleClick('Chest')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Biceps Left & Right */}
                <path
                  d="M 66 88 Q 62 108 68 120 Q 76 116 74 94 Z"
                  fill={getColor(muscleStats['Biceps']?.sets || 0)}
                  stroke={selectedMuscle === 'Biceps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Biceps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Biceps')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 134 88 Q 138 108 132 120 Q 124 116 126 94 Z"
                  fill={getColor(muscleStats['Biceps']?.sets || 0)}
                  stroke={selectedMuscle === 'Biceps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Biceps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Biceps')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Forearms (Left & Right) */}
                <path
                  d="M 64 124 Q 58 148 64 164 Q 72 160 72 130 Z"
                  fill={getColor(muscleStats['Forearms']?.sets || 0)}
                  stroke={selectedMuscle === 'Forearms' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Forearms' ? 2 : 1}
                  onClick={() => handleMuscleClick('Forearms')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 136 124 Q 142 148 136 164 Q 128 160 128 130 Z"
                  fill={getColor(muscleStats['Forearms']?.sets || 0)}
                  stroke={selectedMuscle === 'Forearms' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Forearms' ? 2 : 1}
                  onClick={() => handleMuscleClick('Forearms')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Abs & Core */}
                <rect
                  x="86"
                  y="92"
                  width="28"
                  height="44"
                  rx="6"
                  fill={getColor(muscleStats['Abs']?.sets || 0)}
                  stroke={selectedMuscle === 'Abs' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Abs' ? 2 : 1}
                  onClick={() => handleMuscleClick('Abs')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Obliques */}
                <path
                  d="M 76 96 Q 84 100 84 134 L 76 130 Z"
                  fill={getColor(muscleStats['Obliques']?.sets || 0)}
                  stroke={selectedMuscle === 'Obliques' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Obliques' ? 2 : 1}
                  onClick={() => handleMuscleClick('Obliques')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 124 96 Q 116 100 116 134 L 124 130 Z"
                  fill={getColor(muscleStats['Obliques']?.sets || 0)}
                  stroke={selectedMuscle === 'Obliques' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Obliques' ? 2 : 1}
                  onClick={() => handleMuscleClick('Obliques')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Hip Flexors / Pelvis */}
                <path
                  d="M 80 138 L 120 138 L 112 152 L 88 152 Z"
                  fill={getColor(muscleStats['Hip Flexors']?.sets || 0)}
                  stroke={selectedMuscle === 'Hip Flexors' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Hip Flexors' ? 2 : 1}
                  onClick={() => handleMuscleClick('Hip Flexors')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Quads (Left & Right) */}
                <path
                  d="M 76 156 Q 68 190 74 228 Q 94 226 96 158 Z"
                  fill={getColor(muscleStats['Quads']?.sets || 0)}
                  stroke={selectedMuscle === 'Quads' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Quads' ? 2 : 1}
                  onClick={() => handleMuscleClick('Quads')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 124 156 Q 132 190 126 228 Q 106 226 104 158 Z"
                  fill={getColor(muscleStats['Quads']?.sets || 0)}
                  stroke={selectedMuscle === 'Quads' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Quads' ? 2 : 1}
                  onClick={() => handleMuscleClick('Quads')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Calves (Front Shin/Tibia/Calves) */}
                <path
                  d="M 72 242 Q 68 274 74 308 L 86 308 Q 88 274 84 242 Z"
                  fill={getColor(muscleStats['Calves']?.sets || 0)}
                  stroke={selectedMuscle === 'Calves' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Calves' ? 2 : 1}
                  onClick={() => handleMuscleClick('Calves')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 128 242 Q 132 274 126 308 L 114 308 Q 112 274 116 242 Z"
                  fill={getColor(muscleStats['Calves']?.sets || 0)}
                  stroke={selectedMuscle === 'Calves' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Calves' ? 2 : 1}
                  onClick={() => handleMuscleClick('Calves')}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            ) : (
              /* ── BACK VIEW MUSCLES ──────────────────────────── */
              <g id="back-muscles">
                {/* Traps (Back Diamond) */}
                <path
                  d="M 94 46 L 106 46 L 126 66 L 100 100 L 74 66 Z"
                  fill={getColor(muscleStats['Traps']?.sets || 0)}
                  stroke={selectedMuscle === 'Traps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Traps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Traps')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Rear Delts */}
                <path
                  d="M 68 62 Q 60 74 66 84 Q 74 80 74 68 Z"
                  fill={getColor(muscleStats['Rear Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Rear Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Rear Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Rear Delts')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 132 62 Q 140 74 134 84 Q 126 80 126 68 Z"
                  fill={getColor(muscleStats['Rear Delts']?.sets || 0)}
                  stroke={selectedMuscle === 'Rear Delts' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Rear Delts' ? 2 : 1}
                  onClick={() => handleMuscleClick('Rear Delts')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Triceps (Back of arms) */}
                <path
                  d="M 64 86 Q 58 108 66 122 Q 74 116 72 90 Z"
                  fill={getColor(muscleStats['Triceps']?.sets || 0)}
                  stroke={selectedMuscle === 'Triceps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Triceps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Triceps')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 136 86 Q 142 108 134 122 Q 126 116 128 90 Z"
                  fill={getColor(muscleStats['Triceps']?.sets || 0)}
                  stroke={selectedMuscle === 'Triceps' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Triceps' ? 2 : 1}
                  onClick={() => handleMuscleClick('Triceps')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Lats (Wings) */}
                <path
                  d="M 72 82 Q 92 84 94 116 L 82 128 Q 70 108 72 82 Z"
                  fill={getColor(muscleStats['Lats']?.sets || 0)}
                  stroke={selectedMuscle === 'Lats' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Lats' ? 2 : 1}
                  onClick={() => handleMuscleClick('Lats')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 128 82 Q 108 84 106 116 L 118 128 Q 130 108 128 82 Z"
                  fill={getColor(muscleStats['Lats']?.sets || 0)}
                  stroke={selectedMuscle === 'Lats' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Lats' ? 2 : 1}
                  onClick={() => handleMuscleClick('Lats')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Lower Back (Erectors) */}
                <path
                  d="M 88 114 L 112 114 L 108 142 L 92 142 Z"
                  fill={getColor(muscleStats['Lower Back']?.sets || 0)}
                  stroke={selectedMuscle === 'Lower Back' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Lower Back' ? 2 : 1}
                  onClick={() => handleMuscleClick('Lower Back')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Glutes */}
                <path
                  d="M 76 146 Q 72 178 98 182 L 100 146 Z"
                  fill={getColor(muscleStats['Glutes']?.sets || 0)}
                  stroke={selectedMuscle === 'Glutes' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Glutes' ? 2 : 1}
                  onClick={() => handleMuscleClick('Glutes')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 124 146 Q 128 178 102 182 L 100 146 Z"
                  fill={getColor(muscleStats['Glutes']?.sets || 0)}
                  stroke={selectedMuscle === 'Glutes' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Glutes' ? 2 : 1}
                  onClick={() => handleMuscleClick('Glutes')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Hamstrings */}
                <path
                  d="M 76 186 Q 70 214 76 238 Q 94 234 96 186 Z"
                  fill={getColor(muscleStats['Hamstrings']?.sets || 0)}
                  stroke={selectedMuscle === 'Hamstrings' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Hamstrings' ? 2 : 1}
                  onClick={() => handleMuscleClick('Hamstrings')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 124 186 Q 130 214 124 238 Q 106 234 104 186 Z"
                  fill={getColor(muscleStats['Hamstrings']?.sets || 0)}
                  stroke={selectedMuscle === 'Hamstrings' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Hamstrings' ? 2 : 1}
                  onClick={() => handleMuscleClick('Hamstrings')}
                  style={{ cursor: 'pointer' }}
                />

                {/* Calves (Back Gastrocnemius) */}
                <path
                  d="M 72 244 Q 66 274 74 310 L 86 310 Q 90 274 86 244 Z"
                  fill={getColor(muscleStats['Calves']?.sets || 0)}
                  stroke={selectedMuscle === 'Calves' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Calves' ? 2 : 1}
                  onClick={() => handleMuscleClick('Calves')}
                  style={{ cursor: 'pointer' }}
                />
                <path
                  d="M 128 244 Q 134 274 126 310 L 114 310 Q 110 274 114 244 Z"
                  fill={getColor(muscleStats['Calves']?.sets || 0)}
                  stroke={selectedMuscle === 'Calves' ? '#FAFAFA' : '#141416'}
                  strokeWidth={selectedMuscle === 'Calves' ? 2 : 1}
                  onClick={() => handleMuscleClick('Calves')}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            )}
          </svg>
        </div>

        {/* Selected Muscle Breakdown Panel */}
        <div style={{ flex: '1 1 200px' }}>
          {selectedMuscle && selectedData ? (
            <div
              style={{
                backgroundColor: '#000000',
                borderRadius: 14,
                padding: 16,
                border: '1px solid #232327',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FAFAFA' }}>
                  {selectedMuscle}
                </h4>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: getColor(selectedData.sets),
                    color: '#FAFAFA',
                  }}
                >
                  {selectedData.sets} Sets / Wk
                </span>
              </div>

              {/* Recovery Readiness Progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#A1A1AA' }}>Recovery Readiness:</span>
                  <span style={{ fontWeight: 700, color: selectedData.recoveryPercent >= 90 ? '#2FD67B' : '#F59E0B' }}>
                    {selectedData.recoveryPercent}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, backgroundColor: '#232327', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${selectedData.recoveryPercent}%`,
                      backgroundColor: selectedData.recoveryPercent >= 90 ? '#2FD67B' : '#F59E0B',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>

              {/* Hours since trained */}
              <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 10 }}>
                Last trained:{' '}
                <strong style={{ color: '#FAFAFA' }}>
                  {selectedData.lastTrainedHoursAgo !== null
                    ? `${Math.round(selectedData.lastTrainedHoursAgo)} hrs ago`
                    : 'Not in last 7 days'}
                </strong>
              </div>

              {/* Stimulus tier description */}
              <div
                style={{
                  fontSize: 11,
                  padding: '6px 10px',
                  borderRadius: 8,
                  backgroundColor: '#141416',
                  color: '#A1A1AA',
                  lineHeight: 1.4,
                }}
              >
                {selectedData.sets < 6
                  ? '⚡ Maintenance stimulus (<6 sets). Increase volume for optimal growth.'
                  : selectedData.sets <= 16
                  ? '🎯 Optimal Hypertrophy volume (6–16 sets). High growth response.'
                  : selectedData.sets <= 22
                  ? '🔥 Maximum Recoverable Volume (16–22 sets). Monitor fatigue.'
                  : '⚠️ High fatigue threshold (>22 sets). Consider deloading.'}
              </div>

              {/* Contributed exercises */}
              {selectedData.exercises.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: '#7C7C87' }}>Trained with: </span>
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>
                    {selectedData.exercises.slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#7C7C87', fontSize: 13 }}>
              Tap any muscle on the anatomy figure to inspect recovery status.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid #232327',
          fontSize: 11,
          color: '#A1A1AA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#232327' }} />
          <span>0 sets</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#2F8CFF' }} />
          <span>&lt;6 (Low)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#2FD67B' }} />
          <span>6–16 (Optimal)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#8B5CF6' }} />
          <span>16–22 (High)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#F59E0B' }} />
          <span>&gt;22 (Fatigue)</span>
        </div>
      </div>
    </div>
  );
}
