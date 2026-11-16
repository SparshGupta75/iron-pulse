export type MuscleGroup =
  | 'Chest'
  | 'Front Delts'
  | 'Side Delts'
  | 'Rear Delts'
  | 'Biceps'
  | 'Triceps'
  | 'Lats'
  | 'Upper Back'
  | 'Lower Back'
  | 'Traps'
  | 'Abs'
  | 'Obliques'
  | 'Glutes'
  | 'Quads'
  | 'Hamstrings'
  | 'Calves'
  | 'Forearms'
  | 'Hip Flexors'
  | 'Adductors'
  | 'Abductors';

export type EquipmentCategory =
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight'
  | 'Cardio';

export type TrackingType = 'WeightReps' | 'RepsOnly' | 'Time' | 'Distance';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';
export type WeightUnit = 'kg' | 'lbs';

export interface Exercise {
  id: string;
  name: string;
  category: EquipmentCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  trackingType: TrackingType;
  isCustom: boolean;
  notes?: string;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  folderId?: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSession {
  id: string;
  routineId?: string;
  routineName?: string;
  startedAt: number;
  finishedAt?: number;
  totalVolume: number;
  notes?: string;
  /** Personal records set in this workout. */
  prCount?: number;
  /** Exercise ids in the order they were performed. */
  exerciseOrder?: string[];
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  type: SetType;
  weight: number;
  reps: number;
  rpe?: number;
  rir?: number;
  completed: boolean;
  timestamp: number;
  supersetGroupId?: string;
}

export interface RoutineFolder {
  id: string;
  name: string;
  color?: string;
}

export interface BodyLog {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
  unit: WeightUnit;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  notes?: string;
  calories?: number;
  protein?: number;
}

export interface CardioLog {
  id: string;
  date: string;
  type: 'treadmill' | 'bike' | 'rowing' | 'other';
  durationMinutes: number;
  distanceKm?: number;
  avgHeartRate?: number;
  inclinePercent?: number;
  speedKph?: number;
  notes?: string;
}

export interface AppSettings {
  unit: WeightUnit;
  barbellWeight: number;
  availablePlates: number[];
  theme: 'dark';
}
