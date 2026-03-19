import { create } from 'zustand';

const useRunStore = create((set) => ({
  isRunning: false,
  gpsPoints: [],
  startTime: null,
  currentLocation: null,
  completedRuns: [],

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
    // If completedRunData is provided (meaning valid run with >= 3 points), save it
    if (completedRunData) {
      return {
        isRunning: false,
        gpsPoints: [],
        startTime: null,
        completedRuns: [...state.completedRuns, completedRunData]
      };
    }
    // Otherwise just reset silently
    return {
      isRunning: false,
      gpsPoints: [],
      startTime: null,
    };
  }),
}));

export default useRunStore;
