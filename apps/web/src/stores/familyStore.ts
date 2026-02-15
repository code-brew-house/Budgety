import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      setActiveFamilyId: (id) => set({ activeFamilyId: id }),
    }),
    { name: 'budgety-family' },
  ),
);
