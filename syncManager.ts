import {
  addHabit as apiAddHabit,
  updateHabit as apiUpdateHabit,
  deleteHabbit as apiDeleteHabbit,
  updateHabitCount as apiUpdateHabitCount,
  updateHabitNeedCount as apiUpdateHabitNeedCount,
  getHabits as apiGetHabits,
  getTodaySnapshot as apiGetTodaySnapshot,
  saveDailySnapshot as apiSaveDailySnapshot,
} from "./api";
import IHabbit from "./types/habbit";

// Configuration for auto-sync
const AUTO_SYNC_ENABLED = true;

let syncToSpreadsheetFn: (() => Promise<void>) | null = null;

/**
 * Register the sync function from IntegrationPanel
 */
export const registerSyncFunction = (syncFn: () => Promise<void>) => {
  syncToSpreadsheetFn = syncFn;
};

/**
 * Unregister the sync function (when disconnecting)
 */
export const unregisterSyncFunction = () => {
  syncToSpreadsheetFn = null;
};

/**
 * Trigger sync with debouncing for batch operations
 */
const triggerSync = async () => {
  if (!syncToSpreadsheetFn || !AUTO_SYNC_ENABLED) return;

  console.log("🔄 Triggering spreadsheet sync...");
  await syncToSpreadsheetFn!();
  console.log("✅ Spreadsheet sync completed");
};

/**
 * Wrapped habit functions that trigger sync after operations
 */
export const addHabit = async (
  ...args: Parameters<typeof apiAddHabit>
): ReturnType<typeof apiAddHabit> => {
  const result = await apiAddHabit(...args);
  if (result) {
    triggerSync();
  }
  return result;
};

export const updateHabit = async (
  ...args: Parameters<typeof apiUpdateHabit>
): ReturnType<typeof apiUpdateHabit> => {
  await apiUpdateHabit(...args);
  triggerSync();
};

export const deleteHabbit = async (
  ...args: Parameters<typeof apiDeleteHabbit>
): ReturnType<typeof apiDeleteHabbit> => {
  await apiDeleteHabbit(...args);
  triggerSync();
};

export const updateHabitCount = async (
  ...args: Parameters<typeof apiUpdateHabitCount>
): ReturnType<typeof apiUpdateHabitCount> => {
  const result = await apiUpdateHabitCount(...args);
  if (result) {
    triggerSync();
  }
  return result;
};

export const updateHabitNeedCount = async (
  ...args: Parameters<typeof apiUpdateHabitNeedCount>
): Promise<boolean> => {
  const result = await apiUpdateHabitNeedCount(...args);
  if (result) {
    triggerSync();
  }
  return result;
};

export const getHabits = async (
  ...args: Parameters<typeof apiGetHabits>
): ReturnType<typeof apiGetHabits> => {
  const result = await apiGetHabits(...args);
  // no need to sync with spreadsheet
  return result;
};

export const getTodaySnapshot = async (
  ...args: Parameters<typeof apiGetTodaySnapshot>
): ReturnType<typeof apiGetTodaySnapshot> => {
  const result = await apiGetTodaySnapshot(...args);
  // apiGetTodaySnapshot can create todays snapshot so sync
  if (result) {
    triggerSync();
  }
  return result;
};

export const saveDailySnapshot = async (
  ...args: Parameters<typeof apiSaveDailySnapshot>
): ReturnType<typeof apiSaveDailySnapshot> => {
  const result = await apiSaveDailySnapshot(...args);
  if (result) {
    triggerSync();
  }
  return result;
};
