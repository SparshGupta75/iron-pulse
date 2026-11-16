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
  setUnit: (unit: WeightUnit) => void;
  setBarbellWeight: (weight: number) => void;
  setAvailablePlates: (plates: number[]) => void;
  setDefaultRest: (seconds: number) => void;
  setProfileName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      barbellWeight: 20,
      availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25],
      defaultRest: 90,
      profileName: 'Athlete',
      setUnit: (unit) => set({ unit }),
      setBarbellWeight: (barbellWeight) => set({ barbellWeight }),
      setAvailablePlates: (availablePlates) => set({ availablePlates }),
      setDefaultRest: (defaultRest) => set({ defaultRest }),
      setProfileName: (profileName) => set({ profileName }),
    }),
    { name: 'ironpulse-settings' }
  )
);
