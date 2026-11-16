import { useState, useEffect } from 'react';
import {
  Flame,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { db } from '../db/db';
import type { MuscleGroup, WorkoutSet, WorkoutSession, Exercise } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { MuscleHeatmap } from '../components/analytics/MuscleHeatmap';

const ALL_MUSCLES: MuscleGroup[] = [
  'Chest', 'Front Delts', 'Side Delts', 'Rear Delts', 'Biceps', 'Triceps',
  'Lats', 'Upper Back', 'Lower Back', 'Traps', 'Abs', 'Obliques',
  'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Forearms', 'Hip Flexors',
  'Adductors', 'Abductors',
];

interface MuscleData {
  sets: number;
  lastTrainedHoursAgo: number | null;
  recoveryPercent: number;
  exercises: string[];
}

export default function AnalyticsPage() {
  const { unit } = useSettingsStore();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [muscleStats, setMuscleStats] = useState<Record<MuscleGroup, MuscleData>>(() => {
    const init: Partial<Record<MuscleGroup, MuscleData>> = {};
    ALL_MUSCLES.forEach((m) => {
      init[m] = { sets: 0, lastTrainedHoursAgo: null, recoveryPercent: 100, exercises: [] };
    });
    return init as Record<MuscleGroup, MuscleData>;
  });

  const [volumeByMuscleChart, setVolumeByMuscleChart] = useState<{ muscle: string; sets: number }[]>([]);
  const [oneRmCompoundData, setOneRmCompoundData] = useState<
    { date: string; Bench: number; Squat: number; Deadlift: number; OHP: number }[]
  >([]);
  const [totalWeeklyVolume, setTotalWeeklyVolume] = useState<number>(0);
  const [totalWorkoutsCount, setTotalWorkoutsCount] = useState<number>(0);
  const [plateaus, setPlateaus] = useState<{ exerciseName: string; weight: number }[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      const now = Date.now();
      const cutoff =
        timeRange === '7d'
          ? now - 7 * 86400000
          : timeRange === '30d'
          ? now - 30 * 86400000
          : 0;

      // Fetch completed sessions
      const sessions = await db.workoutSessions
        .where('startedAt')
        .above(cutoff)
        .toArray();

      setTotalWorkoutsCount(sessions.length);

      const sessionIds = sessions.map((s: WorkoutSession) => s.id);
      const sets: WorkoutSet[] = await db.sets
        .where('sessionId')
        .anyOf(sessionIds)
        .filter((s: WorkoutSet) => s.completed)
        .toArray();

      // Total volume
      const totalVol = sets.reduce((sum: number, s: WorkoutSet) => sum + s.weight * s.reps, 0);
      setTotalWeeklyVolume(Math.round(totalVol));

      // Get all exercise definitions
      const allExercises = await db.exercises.toArray();
      const exMap = new Map<string, Exercise>();
      allExercises.forEach((e: Exercise) => exMap.set(e.id, e));

      // Muscle volume tally and recovery calculation
      const statsMap: Partial<Record<MuscleGroup, MuscleData>> = {};
      ALL_MUSCLES.forEach((m) => {
        statsMap[m] = { sets: 0, lastTrainedHoursAgo: null, recoveryPercent: 100, exercises: [] };
      });

      // Track last trained timestamp for each muscle
      const muscleLastTrained = new Map<MuscleGroup, number>();

      for (const s of sets) {
        const ex = exMap.get(s.exerciseId);
        if (!ex) continue;

        // Count sets for primary muscles (1 set each) and secondary muscles (0.5 set each)
        for (const pm of ex.primaryMuscles) {
          const entry = statsMap[pm]!;
          entry.sets += 1;
          if (!entry.exercises.includes(ex.name)) entry.exercises.push(ex.name);
          const prevT = muscleLastTrained.get(pm) || 0;
          if (s.timestamp > prevT) muscleLastTrained.set(pm, s.timestamp);
        }

        for (const sm of ex.secondaryMuscles) {
          const entry = statsMap[sm]!;
          entry.sets += 0.5;
          if (!entry.exercises.includes(ex.name)) entry.exercises.push(ex.name);
          const prevT = muscleLastTrained.get(sm) || 0;
          if (s.timestamp > prevT) muscleLastTrained.set(sm, s.timestamp);
        }
      }

      // Compute recovery readiness % (linear model: 48h to 72h full recovery based on volume)
      ALL_MUSCLES.forEach((m) => {
        const lastT = muscleLastTrained.get(m);
        if (lastT) {
          const hoursAgo = Math.max(0, (now - lastT) / 3600000);
          statsMap[m]!.lastTrainedHoursAgo = hoursAgo;
          // 48 hours for 100% recovery
          const rec = Math.min(100, Math.round((hoursAgo / 48) * 100));
          statsMap[m]!.recoveryPercent = rec;
        } else {
          statsMap[m]!.recoveryPercent = 100;
        }
        statsMap[m]!.sets = Math.round(statsMap[m]!.sets);
      });

      setMuscleStats(statsMap as Record<MuscleGroup, MuscleData>);

      // Prepare Top Muscles volume chart (sorted by sets)
      const chartPoints = Object.entries(statsMap)
        .filter(([, data]) => Boolean(data && data.sets > 0))
        .map(([muscle, data]) => ({ muscle, sets: data!.sets }))
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 8);

      setVolumeByMuscleChart(chartPoints);

      // 1RM progression for Compound Big 4
      const compoundExIds = {
        Bench: 'bb-bench-press',
        Squat: 'bb-back-squat',
        Deadlift: 'bb-deadlift',
        OHP: 'bb-overhead-press',
      };

      const allSessionsChronological = await db.workoutSessions
        .orderBy('startedAt')
        .toArray();

      const compoundTimeline: { date: string; Bench: number; Squat: number; Deadlift: number; OHP: number }[] = [];

      for (const sess of allSessionsChronological) {
        const sSets: WorkoutSet[] = await db.sets
          .where('sessionId')
          .equals(sess.id)
          .filter((s: WorkoutSet) => s.completed)
          .toArray();

        let bench1RM = 0;
        let squat1RM = 0;
        let deadlift1RM = 0;
        let ohp1RM = 0;

        for (const s of sSets) {
          const est1RM = Math.round(s.weight * (1 + s.reps / 30));
          if (s.exerciseId === compoundExIds.Bench && est1RM > bench1RM) bench1RM = est1RM;
          if (s.exerciseId === compoundExIds.Squat && est1RM > squat1RM) squat1RM = est1RM;
          if (s.exerciseId === compoundExIds.Deadlift && est1RM > deadlift1RM) deadlift1RM = est1RM;
          if (s.exerciseId === compoundExIds.OHP && est1RM > ohp1RM) ohp1RM = est1RM;
        }

        if (bench1RM || squat1RM || deadlift1RM || ohp1RM) {
          compoundTimeline.push({
            date: new Date(sess.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            Bench: bench1RM,
            Squat: squat1RM,
            Deadlift: deadlift1RM,
            OHP: ohp1RM,
          });
        }
      }

      setOneRmCompoundData(compoundTimeline.slice(-8));

      // Scan for plateaus (exercises with 3+ sessions and no weight increase)
      const detectedPlateaus: { exerciseName: string; weight: number }[] = [];
      const checkedExercises = ['bb-bench-press', 'bb-overhead-press', 'bb-back-squat'];
      for (const exId of checkedExercises) {
        const exSets: WorkoutSet[] = await db.sets
          .where('exerciseId')
          .equals(exId)
          .filter((s: WorkoutSet) => s.completed && s.type !== 'warmup')
          .toArray();
        if (exSets.length >= 6) {
          const weights = exSets.map((s: WorkoutSet) => s.weight);
          const lastW = weights[weights.length - 1];
          const firstW = weights[weights.length - 5];
          if (lastW > 0 && lastW <= firstW) {
            const exDef = exMap.get(exId);
            if (exDef) detectedPlateaus.push({ exerciseName: exDef.name, weight: lastW });
          }
        }
      }
      setPlateaus(detectedPlateaus);
    }

    loadAnalytics();
  }, [timeRange]);

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80, backgroundColor: '#000000' }}>
      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Header & Range Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#FAFAFA' }}>
              Analytics
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7C7C87' }}>
              Hypertrophy stimulus & strength trends
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: '#141416',
              borderRadius: 8,
              padding: 3,
              border: '1px solid #232327',
            }}
          >
            {(['7d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: timeRange === r ? '#2F8CFF' : 'transparent',
                  color: timeRange === r ? '#FAFAFA' : '#7C7C87',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* High-Level Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 14,
              padding: '16px',
              border: '1px solid #232327',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B', fontSize: 12, fontWeight: 700 }}>
              <Flame size={15} /> Total Volume
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', marginTop: 4 }}>
              {totalWeeklyVolume >= 1000
                ? `${(totalWeeklyVolume / 1000).toFixed(1)}t`
                : `${totalWeeklyVolume} ${unit}`}
            </div>
            <div style={{ fontSize: 11, color: '#7C7C87', marginTop: 2 }}>In {timeRange} window</div>
          </div>

          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 14,
              padding: '16px',
              border: '1px solid #232327',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2F8CFF', fontSize: 12, fontWeight: 700 }}>
              <Dumbbell size={15} /> Completed Sessions
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', marginTop: 4 }}>
              {totalWorkoutsCount}
            </div>
            <div style={{ fontSize: 11, color: '#7C7C87', marginTop: 2 }}>Logged workouts</div>
          </div>
        </div>

        {/* Interactive Muscle Heatmap & Recovery */}
        <div style={{ marginBottom: 20 }}>
          <MuscleHeatmap muscleStats={muscleStats} />
        </div>

        {/* Weekly Volume by Muscle Group Bar Chart */}
        {volumeByMuscleChart.length > 0 && (
          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 16,
              padding: 16,
              border: '1px solid #232327',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
              Working Sets by Muscle Group
            </h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByMuscleChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232327" horizontal={false} />
                  <XAxis type="number" stroke="#7C7C87" fontSize={11} />
                  <YAxis type="category" dataKey="muscle" stroke="#A1A1AA" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141416', borderColor: '#232327', color: '#FAFAFA' }}
                  />
                  <Bar dataKey="sets" name="Sets" fill="#2FD67B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Compound 1RM Progression (Big 4) */}
        {oneRmCompoundData.length > 0 && (
          <div
            style={{
              backgroundColor: '#141416',
              borderRadius: 16,
              padding: 16,
              border: '1px solid #232327',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
              Estimated 1RM Strength ({unit})
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#7C7C87' }}>
              Calculated via Epley formula: weight × (1 + reps / 30)
            </p>
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={oneRmCompoundData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232327" />
                  <XAxis dataKey="date" stroke="#7C7C87" fontSize={11} />
                  <YAxis stroke="#7C7C87" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141416', borderColor: '#232327', color: '#FAFAFA' }}
                  />
                  <Line type="monotone" dataKey="Bench" stroke="#2F8CFF" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Squat" stroke="#2FD67B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Deadlift" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="OHP" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8, fontSize: 11 }}>
              <span style={{ color: '#2F8CFF' }}>● Bench</span>
              <span style={{ color: '#2FD67B' }}>● Squat</span>
              <span style={{ color: '#F59E0B' }}>● Deadlift</span>
              <span style={{ color: '#8B5CF6' }}>● OHP</span>
            </div>
          </div>
        )}

        {/* Deload & Plateau Detection Advice */}
        {plateaus.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: 14,
              padding: 16,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F59E0B', marginBottom: 6 }}>
              <AlertTriangle size={18} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                Plateau Detected on {plateaus.length} Movement(s)
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
              Weight has stalled for 3+ sessions on:{' '}
              <strong style={{ color: '#FAFAFA' }}>
                {plateaus.map((p) => `${p.exerciseName} (${p.weight} ${unit})`).join(', ')}
              </strong>
              . Consider a 1-week 10–15% deload or swapping movement variation to break through adaptations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
