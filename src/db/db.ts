import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, WorkoutSession, WorkoutSet, BodyLog, CardioLog } from '../types';

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export class IronPulseDB extends Dexie {
  exercises!: Table<Exercise>;
  routines!: Table<Routine>;
  workoutSessions!: Table<WorkoutSession>;
  sets!: Table<WorkoutSet>;
  bodyLogs!: Table<BodyLog>;
  cardioLogs!: Table<CardioLog>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super('IronPulseDB');
    this.version(1).stores({
      exercises: 'id, name, category, trackingType, isCustom',
      routines: 'id, name, folderId, createdAt, updatedAt',
      workoutSessions: 'id, routineId, startedAt, finishedAt',
      sets: 'id, sessionId, exerciseId, completed, timestamp',
      bodyLogs: 'id, date',
      cardioLogs: 'id, date, type',
      settings: 'key',
    });
  }
}

export const db = new IronPulseDB();
