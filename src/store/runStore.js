import { create } from 'zustand';

const loadRuns = () => {
  try {
    const data = localStorage.getItem('stridewars_runs');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveRuns = (runs) => {
  try {
    localStorage.setItem('stridewars_runs', JSON.stringify(runs));
  } catch (e) {
    console.error("Failed to save runs", e);
  }
};

const useRunStore = create((set, get) => ({
  isRunning: false,
  gpsPoints: [],
  startTime: null,
  currentLocation: null,
  savedRuns: loadRuns(),

  startRun: () => set({
    isRunning: true,
    gpsPoints: [],
    startTime: Date.now(),
  }),

  addGpsPoint: (point) => set((state) => ({
    gpsPoints: [...state.gpsPoints, point]
  })),

  setCurrentLocation: (loc) => set({ currentLocation: loc }),

  stopRun: (completedRunData) => set((state) => {
    if (completedRunData) {
      const newRuns = [...state.savedRuns, completedRunData];
      saveRuns(newRuns);
      return {
        isRunning: false,
        gpsPoints: [],
        startTime: null,
        savedRuns: newRuns
      };
    }
    return {
      isRunning: false,
      gpsPoints: [],
      startTime: null,
    };
  }),

  deleteRun: (id) => set((state) => {
    const newRuns = state.savedRuns.filter(r => r.id !== id);
    saveRuns(newRuns);
    return { savedRuns: newRuns };
  })
}));

export default useRunStore;
