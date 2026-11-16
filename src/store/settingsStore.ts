import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeightUnit } from '../types';

interface SettingsState {
  unit: WeightUnit;
  barbellWeight: number;
  availablePlates: number[];
  /** Default rest between sets for newly added exercises, seconds. */
  defaultRest: number;
  profileName: string;
  /** Planned training days, 0 = Monday … 6 = Sunday. */
  reminderDays: number[];
  /** "HH:MM" (24h) for the calendar reminder. */
  reminderTime: string;
  /** Show a notification when a rest ends while the app is in the background. */
  restNotify: boolean;
  setUnit: (unit: WeightUnit) => void;
  setBarbellWeight: (weight: number) => void;
  setAvailablePlates: (plates: number[]) => void;
  setDefaultRest: (seconds: number) => void;
  setProfileName: (name: string) => void;
  setReminderDays: (days: number[]) => void;
  setReminderTime: (time: string) => void;
  setRestNotify: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      barbellWeight: 20,
      availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25],
      defaultRest: 90,
      profileName: 'Athlete',
      reminderDays: [],
      reminderTime: '18:00',
      restNotify: false,
      setUnit: (unit) => set({ unit }),
      setBarbellWeight: (barbellWeight) => set({ barbellWeight }),
      setAvailablePlates: (availablePlates) => set({ availablePlates }),
      setDefaultRest: (defaultRest) => set({ defaultRest }),
      setProfileName: (profileName) => set({ profileName }),
      setReminderDays: (reminderDays) => set({ reminderDays }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      setRestNotify: (restNotify) => set({ restNotify }),
    }),
    { name: 'ironpulse-settings' }
  )
);
