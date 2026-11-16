import { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  ShieldCheck,
  Zap,
  Sparkles,
} from 'lucide-react';
import { db } from '../db/db';
import { useSettingsStore } from '../store/settingsStore';
import { parseAndImportHevyCSV } from '../utils/hevyCsvParser';
import type { WeightUnit, WorkoutSession, WorkoutSet, BodyLog, CardioLog } from '../types';

export default function SettingsPage() {
  const {
    unit,
    setUnit,
    barbellWeight,
    setBarbellWeight,
    availablePlates,
    setAvailablePlates,
  } = useSettingsStore();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Toggle available plate
  const togglePlate = (plate: number) => {
    if (availablePlates.includes(plate)) {
      if (availablePlates.length <= 1) return;
      setAvailablePlates(availablePlates.filter((p) => p !== plate));
    } else {
      setAvailablePlates([...availablePlates, plate].sort((a, b) => b - a));
    }
  };

  // 1-Click JSON Backup
  const handleExportBackup = async () => {
    try {
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        exercises: await db.exercises.toArray(),
        routines: await db.routines.toArray(),
        workoutSessions: await db.workoutSessions.toArray(),
        sets: await db.sets.toArray(),
        bodyLogs: await db.bodyLogs.toArray(),
        cardioLogs: await db.cardioLogs.toArray(),
        settings: await db.settings.toArray(),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ironpulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Backup export failed');
    }
  };

  // 1-Click CSV Workout History Export
  const handleExportCSV = async () => {
    try {
      const sessions = await db.workoutSessions.orderBy('startedAt').toArray();
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));
      const exercises = await db.exercises.toArray();
      const exMap = new Map(exercises.map((e) => [e.id, e]));
      const sets = await db.sets.orderBy('timestamp').toArray();

      const headers = ['Date', 'Workout Name', 'Exercise Name', 'Category', 'Set Order', 'Weight', 'Reps', 'RPE', 'Completed'];
      const lines = [headers.join(',')];

      for (const s of sets) {
        const sess = sessionMap.get(s.sessionId);
        const ex = exMap.get(s.exerciseId);
        const dateStr = sess ? new Date(sess.startedAt).toISOString().slice(0, 19).replace('T', ' ') : '';
        const workoutName = sess?.routineName || 'Workout';
        const exName = ex?.name || 'Exercise';
        const cat = ex?.category || '';
        const row = [
          `"${dateStr}"`,
          `"${workoutName.replace(/"/g, '""')}"`,
          `"${exName.replace(/"/g, '""')}"`,
          `"${cat}"`,
          s.setNumber,
          s.weight,
          s.reps,
          s.rpe ?? '',
          s.completed ? '1' : '0',
        ];
        lines.push(row.join(','));
      }

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ironpulse-history-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('CSV export failed');
    }
  };

  // 1-Click JSON Restore
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.exercises) await db.exercises.bulkPut(data.exercises);
        if (data.routines) await db.routines.bulkPut(data.routines);
        if (data.workoutSessions) await db.workoutSessions.bulkPut(data.workoutSessions);
        if (data.sets) await db.sets.bulkPut(data.sets);
        if (data.bodyLogs) await db.bodyLogs.bulkPut(data.bodyLogs);
        if (data.cardioLogs) await db.cardioLogs.bulkPut(data.cardioLogs);

        alert('Backup restored successfully! All workout history and routines loaded.');
        window.location.reload();
      } catch {
        alert('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
  };

  // Hevy CSV Upload
  const handleHevyCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Parsing Hevy workout history…');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const result = await parseAndImportHevyCSV(csvText);
        setImportStatus(
          `Import complete! Added ${result.workoutsImported} workouts, ${result.setsImported} sets, and created ${result.newExercisesCreated} custom exercises.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid CSV format';
        setImportStatus(`Import error: ${msg}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Load sample demo Hevy CSV
  const handleLoadSampleHevyData = async () => {
    setIsImporting(true);
    setImportStatus('Importing sample Hevy history…');

    const sampleCsv = `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE
2026-11-01 10:00:00,Upper Body Push,Barbell Bench Press,1,75,10,8
2026-11-01 10:05:00,Upper Body Push,Barbell Bench Press,2,75,10,8.5
2026-11-01 10:10:00,Upper Body Push,Barbell Bench Press,3,75,10,9
2026-11-01 10:15:00,Upper Body Push,Barbell Overhead Press,1,45,8,8
2026-11-01 10:20:00,Upper Body Push,Barbell Overhead Press,2,45,8,8.5
2026-11-01 10:25:00,Upper Body Push,Cable Pushdown,1,25,12,7
2026-11-04 10:00:00,Upper Body Push,Barbell Bench Press,1,77.5,10,8
2026-11-04 10:05:00,Upper Body Push,Barbell Bench Press,2,77.5,10,8.5
2026-11-04 10:10:00,Upper Body Push,Barbell Bench Press,3,77.5,10,9
2026-11-04 10:15:00,Upper Body Push,Barbell Overhead Press,1,47.5,8,8
2026-11-08 10:00:00,Lower Body Leg Day,Barbell Back Squat,1,100,6,8
2026-11-08 10:05:00,Lower Body Leg Day,Barbell Back Squat,2,100,6,8.5
2026-11-08 10:10:00,Lower Body Leg Day,Barbell Back Squat,3,100,6,9
2026-11-08 10:15:00,Lower Body Leg Day,Romanian Deadlift,1,90,8,8`;

    try {
      const result = await parseAndImportHevyCSV(sampleCsv);
      setImportStatus(
        `Sample history loaded! ${result.workoutsImported} workouts & ${result.setsImported} sets added.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setImportStatus(`Import error: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Seed Rich Demo Dataset (Workouts, PRs, Heatmap data, Body metrics)
  const handleSeedDemoData = async () => {
    setIsImporting(true);
    setImportStatus('Seeding realistic demo workouts, PRs and body metrics…');
    try {
      const now = Date.now();
      const dayMs = 86400000;

      const demoSessions: WorkoutSession[] = [
        {
          id: `demo-sess-1`,
          routineId: 'routine-push',
          routineName: 'Push Day (Chest, Shoulders, Triceps)',
          startedAt: now - dayMs * 6,
          finishedAt: now - dayMs * 6 + 3600000,
          totalVolume: 4320,
        },
        {
          id: `demo-sess-2`,
          routineId: 'routine-pull',
          routineName: 'Pull Day (Back, Rear Delts, Biceps)',
          startedAt: now - dayMs * 4,
          finishedAt: now - dayMs * 4 + 3400000,
          totalVolume: 5100,
        },
        {
          id: `demo-sess-3`,
          routineId: 'routine-legs',
          routineName: 'Legs & Abs (Quads, Hamstrings, Calves)',
          startedAt: now - dayMs * 2,
          finishedAt: now - dayMs * 2 + 4200000,
          totalVolume: 6480,
        },
        {
          id: `demo-sess-4`,
          routineId: 'routine-push',
          routineName: 'Push Day (Chest, Shoulders, Triceps)',
          startedAt: now - dayMs * 1,
          finishedAt: now - dayMs * 1 + 3700000,
          totalVolume: 4680,
        },
      ];

      const demoSets: WorkoutSet[] = [
        // Push 1
        { id: 'ds-1', sessionId: 'demo-sess-1', exerciseId: 'bb-bench-press', setNumber: 1, type: 'warmup', weight: 40, reps: 10, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-2', sessionId: 'demo-sess-1', exerciseId: 'bb-bench-press', setNumber: 2, type: 'normal', weight: 80, reps: 8, rpe: 8, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-3', sessionId: 'demo-sess-1', exerciseId: 'bb-bench-press', setNumber: 3, type: 'normal', weight: 80, reps: 8, rpe: 8.5, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-4', sessionId: 'demo-sess-1', exerciseId: 'bb-bench-press', setNumber: 4, type: 'normal', weight: 80, reps: 8, rpe: 9, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-5', sessionId: 'demo-sess-1', exerciseId: 'bb-overhead-press', setNumber: 1, type: 'normal', weight: 50, reps: 8, rpe: 8, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-6', sessionId: 'demo-sess-1', exerciseId: 'bb-overhead-press', setNumber: 2, type: 'normal', weight: 50, reps: 8, rpe: 8.5, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-7', sessionId: 'demo-sess-1', exerciseId: 'cb-pushdown', setNumber: 1, type: 'normal', weight: 30, reps: 12, completed: true, timestamp: now - dayMs * 6 },
        { id: 'ds-8', sessionId: 'demo-sess-1', exerciseId: 'cb-pushdown', setNumber: 2, type: 'normal', weight: 30, reps: 12, completed: true, timestamp: now - dayMs * 6 },

        // Pull 1
        { id: 'ds-9', sessionId: 'demo-sess-2', exerciseId: 'bb-deadlift', setNumber: 1, type: 'normal', weight: 120, reps: 5, rpe: 8, completed: true, timestamp: now - dayMs * 4 },
        { id: 'ds-10', sessionId: 'demo-sess-2', exerciseId: 'bb-deadlift', setNumber: 2, type: 'normal', weight: 120, reps: 5, rpe: 8.5, completed: true, timestamp: now - dayMs * 4 },
        { id: 'ds-11', sessionId: 'demo-sess-2', exerciseId: 'bb-row', setNumber: 1, type: 'normal', weight: 70, reps: 10, completed: true, timestamp: now - dayMs * 4 },
        { id: 'ds-12', sessionId: 'demo-sess-2', exerciseId: 'bb-row', setNumber: 2, type: 'normal', weight: 70, reps: 10, completed: true, timestamp: now - dayMs * 4 },
        { id: 'ds-13', sessionId: 'demo-sess-2', exerciseId: 'mach-lat-pulldown', setNumber: 1, type: 'normal', weight: 65, reps: 10, completed: true, timestamp: now - dayMs * 4 },
        { id: 'ds-14', sessionId: 'demo-sess-2', exerciseId: 'db-curl', setNumber: 1, type: 'normal', weight: 16, reps: 10, completed: true, timestamp: now - dayMs * 4 },

        // Legs 1
        { id: 'ds-15', sessionId: 'demo-sess-3', exerciseId: 'bb-back-squat', setNumber: 1, type: 'normal', weight: 100, reps: 6, rpe: 8, completed: true, timestamp: now - dayMs * 2 },
        { id: 'ds-16', sessionId: 'demo-sess-3', exerciseId: 'bb-back-squat', setNumber: 2, type: 'normal', weight: 100, reps: 6, rpe: 8.5, completed: true, timestamp: now - dayMs * 2 },
        { id: 'ds-17', sessionId: 'demo-sess-3', exerciseId: 'bb-back-squat', setNumber: 3, type: 'normal', weight: 100, reps: 6, rpe: 9, completed: true, timestamp: now - dayMs * 2 },
        { id: 'ds-18', sessionId: 'demo-sess-3', exerciseId: 'bb-romanian-deadlift', setNumber: 1, type: 'normal', weight: 85, reps: 10, completed: true, timestamp: now - dayMs * 2 },
        { id: 'ds-19', sessionId: 'demo-sess-3', exerciseId: 'bb-romanian-deadlift', setNumber: 2, type: 'normal', weight: 85, reps: 10, completed: true, timestamp: now - dayMs * 2 },
        { id: 'ds-20', sessionId: 'demo-sess-3', exerciseId: 'mach-leg-press', setNumber: 1, type: 'normal', weight: 160, reps: 12, completed: true, timestamp: now - dayMs * 2 },

        // Push 2
        { id: 'ds-21', sessionId: 'demo-sess-4', exerciseId: 'bb-bench-press', setNumber: 1, type: 'normal', weight: 82.5, reps: 10, rpe: 8.5, completed: true, timestamp: now - dayMs * 1 },
        { id: 'ds-22', sessionId: 'demo-sess-4', exerciseId: 'bb-bench-press', setNumber: 2, type: 'normal', weight: 82.5, reps: 10, rpe: 9, completed: true, timestamp: now - dayMs * 1 },
        { id: 'ds-23', sessionId: 'demo-sess-4', exerciseId: 'bb-bench-press', setNumber: 3, type: 'normal', weight: 82.5, reps: 10, rpe: 9.5, completed: true, timestamp: now - dayMs * 1 },
        { id: 'ds-24', sessionId: 'demo-sess-4', exerciseId: 'bb-overhead-press', setNumber: 1, type: 'normal', weight: 52.5, reps: 8, completed: true, timestamp: now - dayMs * 1 },
        { id: 'ds-25', sessionId: 'demo-sess-4', exerciseId: 'db-lateral-raise', setNumber: 1, type: 'normal', weight: 12, reps: 15, completed: true, timestamp: now - dayMs * 1 },
      ];

      const demoBodyLogs: BodyLog[] = [
        { id: 'dbl-1', date: new Date(now - dayMs * 6).toISOString().slice(0, 10), weight: 79.2, unit: 'kg', calories: 2400, protein: 170, waistCm: 84 },
        { id: 'dbl-2', date: new Date(now - dayMs * 5).toISOString().slice(0, 10), weight: 79.0, unit: 'kg', calories: 2350, protein: 175, waistCm: 83.8 },
        { id: 'dbl-3', date: new Date(now - dayMs * 4).toISOString().slice(0, 10), weight: 78.8, unit: 'kg', calories: 2420, protein: 180, waistCm: 83.5 },
        { id: 'dbl-4', date: new Date(now - dayMs * 3).toISOString().slice(0, 10), weight: 78.9, unit: 'kg', calories: 2380, protein: 172, waistCm: 83.5 },
        { id: 'dbl-5', date: new Date(now - dayMs * 2).toISOString().slice(0, 10), weight: 78.5, unit: 'kg', calories: 2400, protein: 178, waistCm: 83.2 },
        { id: 'dbl-6', date: new Date(now - dayMs * 1).toISOString().slice(0, 10), weight: 78.3, unit: 'kg', calories: 2450, protein: 182, waistCm: 83.0 },
        { id: 'dbl-7', date: new Date(now).toISOString().slice(0, 10), weight: 78.2, unit: 'kg', calories: 2400, protein: 180, waistCm: 82.8 },
      ];

      const demoCardio: CardioLog = {
        id: 'dcl-1',
        date: new Date(now - dayMs * 3).toISOString().slice(0, 10),
        type: 'treadmill',
        durationMinutes: 30,
        distanceKm: 3.6,
        inclinePercent: 12,
        speedKph: 4.8,
        avgHeartRate: 132,
        notes: 'Incline walk (12-3-30 protocol)',
      };

      await db.workoutSessions.bulkPut(demoSessions);
      await db.sets.bulkPut(demoSets);
      await db.bodyLogs.bulkPut(demoBodyLogs);
      await db.cardioLogs.put(demoCardio);

      setImportStatus('Demo dataset loaded! 4 workouts, 25 sets, 7 days of body logs, and LISS cardio.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setImportStatus(`Failed to load demo data: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const allPossiblePlates =
    unit === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];

  return (
    <div style={{ minHeight: '100%', paddingBottom: 80, backgroundColor: '#000000' }}>
      <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#FAFAFA' }}>
            Settings & Portability
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7C7C87' }}>
            Units, plate configuration & zero-lock-in data migration
          </p>
        </div>

        {/* Units & Barbell Configuration */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 18,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
            Units & Barbell Weights
          </h3>

          {/* Unit Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Weight Unit</div>
              <div style={{ fontSize: 12, color: '#7C7C87' }}>Switch between metric and imperial</div>
            </div>
            <div style={{ display: 'flex', backgroundColor: '#000000', borderRadius: 8, padding: 3, border: '1px solid #232327' }}>
              {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: unit === u ? '#2F8CFF' : 'transparent',
                    color: unit === u ? '#FAFAFA' : '#7C7C87',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Barbell Base Weight */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Default Barbell Weight</div>
              <div style={{ fontSize: 12, color: '#7C7C87' }}>Weight of standard Olympic barbell</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(unit === 'kg' ? [20, 15, 10] : [45, 35, 15]).map((w) => (
                <button
                  key={w}
                  onClick={() => setBarbellWeight(w)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: barbellWeight === w ? '1px solid #2F8CFF' : '1px solid #232327',
                    backgroundColor: barbellWeight === w ? 'rgba(47,140,255,0.15)' : '#000000',
                    color: barbellWeight === w ? '#2F8CFF' : '#A1A1AA',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {w} {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Available Plates Checkboxes */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA', marginBottom: 4 }}>
              Available Gym Plates ({unit})
            </div>
            <div style={{ fontSize: 12, color: '#7C7C87', marginBottom: 10 }}>
              Used by plate calculator to compute plates per side
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allPossiblePlates.map((p) => {
                const active = availablePlates.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlate(p)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: active ? '1px solid #2FD67B' : '1px solid #232327',
                      backgroundColor: active ? 'rgba(47,214,123,0.15)' : '#000000',
                      color: active ? '#2FD67B' : '#7C7C87',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {p} {unit} {active && '✓'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hevy CSV Importer */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 18,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FileSpreadsheet size={18} color="#2F8CFF" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
              Import Hevy Workout History
            </h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
            Migrate from Hevy with zero lock-in. Upload your standard Hevy workout history CSV to bring over your historical workouts, exercises, and PRs.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label
              style={{
                flex: '1 1 180px',
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: '#2F8CFF',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Upload size={16} /> Upload Hevy CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleHevyCSVUpload}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={handleLoadSampleHevyData}
              disabled={isImporting}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={15} color="#F59E0B" /> Load Sample Hevy Log
            </button>
          </div>

          {importStatus && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#000000',
                border: '1px solid #232327',
                fontSize: 12,
                color: '#2FD67B',
                lineHeight: 1.4,
              }}
            >
              {importStatus}
            </div>
          )}
        </div>

        {/* 1-Click JSON & CSV Portability */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 18,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Database size={18} color="#2FD67B" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#FAFAFA' }}>
              Full Database Portability
            </h3>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
            All your data lives 100% offline in IndexedDB on this device. Create instant full JSON snapshots, export workout logs to CSV, or restore anytime.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportBackup}
              style={{
                flex: '1 1 140px',
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Download size={15} /> Export JSON
            </button>

            <button
              onClick={handleExportCSV}
              style={{
                flex: '1 1 140px',
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#232327',
                border: 'none',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>

            <label
              style={{
                flex: '1 1 140px',
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#232327',
                color: '#FAFAFA',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                textAlign: 'center',
              }}
            >
              <Upload size={15} /> Restore JSON
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Demo Data Seeder */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #232327',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#F59E0B" /> Demo Dataset
              </div>
              <div style={{ fontSize: 12, color: '#7C7C87', marginTop: 2 }}>
                Pre-populate realistic workouts, PRs, muscle volume & body logs
              </div>
            </div>

            <button
              onClick={handleSeedDemoData}
              disabled={isImporting}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #F59E0B',
                color: '#F59E0B',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Seed Demo Workouts
            </button>
          </div>
        </div>

        {/* App Info & Offline Status */}
        <div
          style={{
            backgroundColor: '#141416',
            borderRadius: 16,
            padding: 16,
            border: '1px solid #232327',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={18} color="#2FD67B" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#FAFAFA' }}>
              IronPulse v1.0.0 PWA
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#7C7C87', lineHeight: 1.5 }}>
            Offline-first architecture powered by IndexedDB & Dexie.js. Zero network latency, instant writes, and full service worker caching for gym basements with zero cell reception.
          </p>
        </div>
      </div>
    </div>
  );
}
