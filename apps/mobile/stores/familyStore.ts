import { create } from 'zustand';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  activeFamilyId: null,
  setActiveFamilyId: (id) => set({ activeFamilyId: id }),
}));
