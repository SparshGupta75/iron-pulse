import { db } from '../db/db';
import type { WorkoutSession, WorkoutSet, Exercise } from '../types';

export interface HevyImportResult {
  workoutsImported: number;
  setsImported: number;
  newExercisesCreated: number;
}

// Split CSV lines taking quotes into account
function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const line of rawLines) {
    const row: string[] = [];
    let insideQuotes = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim().replace(/^"|"$/g, ''));
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim().replace(/^"|"$/g, ''));
    lines.push(row);
  }

  return lines;
}

export async function parseAndImportHevyCSV(csvContent: string): Promise<HevyImportResult> {
  const rows = parseCSVLines(csvContent);
  if (rows.length < 2) {
    throw new Error('CSV is empty or missing data rows');
  }

  // Header row
  const headers = rows[0].map((h) => h.toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const workoutNameIdx = headers.findIndex((h) => h.includes('workout') || h.includes('title'));
  const exerciseIdx = headers.findIndex((h) => h.includes('exercise'));
  const setOrderIdx = headers.findIndex((h) => h.includes('set') || h.includes('order'));
  const weightIdx = headers.findIndex((h) => h.includes('weight') || h.includes('kg') || h.includes('lbs'));
  const repsIdx = headers.findIndex((h) => h.includes('rep'));
  const rpeIdx = headers.findIndex((h) => h.includes('rpe'));

  if (dateIdx === -1 || exerciseIdx === -1) {
    throw new Error('Could not find required Date or Exercise columns in CSV');
  }

  // Pre-load existing exercises
  const existingExercises = await db.exercises.toArray();
  const exerciseMap = new Map<string, string>(); // lowercase name -> id
  existingExercises.forEach((e) => exerciseMap.set(e.name.toLowerCase(), e.id));

  let newExercisesCreated = 0;

  // Group rows by workout session key (e.g. date + workoutName)
  const sessionMap = new Map<string, {
    dateStr: string;
    workoutName: string;
    rows: string[][];
  }>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= dateIdx || !row[dateIdx]) continue;

    const dateStr = row[dateIdx];
    const workoutName = workoutNameIdx !== -1 && row[workoutNameIdx] ? row[workoutNameIdx] : 'Hevy Workout';
    const key = `${dateStr}___${workoutName}`;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, { dateStr, workoutName, rows: [] });
    }
    sessionMap.get(key)!.rows.push(row);
  }

  const sessionsToInsert: WorkoutSession[] = [];
  const setsToInsert: WorkoutSet[] = [];

  for (const [, { dateStr, workoutName, rows: workoutRows }] of sessionMap.entries()) {
    const sessionId = `hevy-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const parsedDate = new Date(dateStr);
    const startedAt = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();

    let totalVolume = 0;

    for (let setIdx = 0; setIdx < workoutRows.length; setIdx++) {
      const row = workoutRows[setIdx];
      const exNameRaw = row[exerciseIdx] || 'Custom Movement';
      const exNameKey = exNameRaw.toLowerCase();

      // Find or create exercise
      let exerciseId = exerciseMap.get(exNameKey);
      if (!exerciseId) {
        // Create custom exercise
        exerciseId = `custom-hevy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newEx: Exercise = {
          id: exerciseId,
          name: exNameRaw,
          category: 'Barbell',
          primaryMuscles: ['Chest'],
          secondaryMuscles: [],
          trackingType: 'WeightReps',
          isCustom: true,
        };
        await db.exercises.put(newEx);
        exerciseMap.set(exNameKey, exerciseId);
        newExercisesCreated++;
      }

      const weightVal = weightIdx !== -1 && row[weightIdx] ? parseFloat(row[weightIdx]) || 0 : 0;
      const repsVal = repsIdx !== -1 && row[repsIdx] ? parseInt(row[repsIdx], 10) || 0 : 0;
      const setOrderVal = setOrderIdx !== -1 && row[setOrderIdx] ? parseInt(row[setOrderIdx], 10) || (setIdx + 1) : (setIdx + 1);
      const rpeVal = rpeIdx !== -1 && row[rpeIdx] ? parseFloat(row[rpeIdx]) || undefined : undefined;

      totalVolume += weightVal * repsVal;

      setsToInsert.push({
        id: `hevy-set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        exerciseId,
        setNumber: setOrderVal,
        type: 'normal',
        weight: weightVal,
        reps: repsVal,
        rpe: rpeVal,
        completed: true,
        timestamp: startedAt + setIdx * 60000,
      });
    }

    sessionsToInsert.push({
      id: sessionId,
      routineName: workoutName,
      startedAt,
      finishedAt: startedAt + 3600000, // 1 hour approx
      totalVolume,
    });
  }

  if (sessionsToInsert.length > 0) {
    await db.workoutSessions.bulkPut(sessionsToInsert);
  }
  if (setsToInsert.length > 0) {
    await db.sets.bulkPut(setsToInsert);
  }

  return {
    workoutsImported: sessionsToInsert.length,
    setsImported: setsToInsert.length,
    newExercisesCreated,
  };
}
