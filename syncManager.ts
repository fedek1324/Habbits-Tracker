import {
  addHabit as apiAddHabit,
  updateHabit as apiUpdateHabit,
  deleteHabbit as apiDeleteHabbit,
  updateHabitCount as apiUpdateHabitCount,
  updateHabitNeedCount as apiUpdateHabitNeedCount,
  getHabits as apiGetHabits,
  getTodaySnapshot as apiGetTodaySnapshot,
  saveDailySnapshot as apiSaveDailySnapshot,
} from "./services/apiLocalStorage";

/**
 * If false sync with google sheets will not be performed
 */
const AUTO_SYNC_ENABLED = true;
const DEBOUNCE_MS = 500;

/**
 * Function that we set from outside that will perform sync with google
 * spreadsheet.
 */
let syncToSpreadsheetFn: (() => Promise<void>) | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
/**
 * If true query to google is performing
 */
let pending = false;

/**
 * If syncToSpreadsheetFn was called to execute in time 
 * of other query execute then suspend it and set hasQueue to true
 */
let hasQueue = false;

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
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pending = false;
};

/**
 * Actual sync execution function
 */
const executeSync = async () => {
  if (!syncToSpreadsheetFn || !AUTO_SYNC_ENABLED) return;

  console.log("🔄 Triggering spreadsheet sync...");
  pending = true;
  try {
    await syncToSpreadsheetFn();
    console.log("✅ Spreadsheet sync completed");
  } catch (error) {
    console.error("❌ Spreadsheet sync failed:", error);
  } finally {
    pending = false;

    if (hasQueue) {
      hasQueue = false;
      await executeSync();
    }
  }
};

/**
 * Trigger sync with debouncing for batch operations.
 * Rejects when sync fucntion is not set.
 * Resolves when function was executed.
 */
export const triggerSync = (operationName?: string): Promise<void> => {
  console.log("triggerSync called with operation " + operationName);
  return new Promise((resolve, reject) => {
    console.log("Promise triggerSync called with operation " + operationName);
    if (!syncToSpreadsheetFn || !AUTO_SYNC_ENABLED) {
      reject();
      return;
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (!pending) {
        executeSync().then(() => {
          resolve();
        });
      } else {
        console.log("Pending is now. Operation suspended");
        hasQueue = true;
      }
    }, DEBOUNCE_MS);

    console.log(
      `⏱️ Sync scheduled in ${DEBOUNCE_MS}ms (debounced). 
      Operation name: ${operationName}`
    );
  })
};

/**
 * Wrapped habit functions that trigger sync after operations
 */
export const addHabit = async (
  ...args: Parameters<typeof apiAddHabit>
): Promise<ReturnType<typeof apiAddHabit>> => {
  const result = await apiAddHabit(...args);
  if (result) {
    triggerSync("addHabit");
  }
  return result;
};

export const updateHabit = async (
  ...args: Parameters<typeof apiUpdateHabit>
): Promise<ReturnType<typeof apiUpdateHabit>> => {
  await apiUpdateHabit(...args);
  triggerSync("updateHabit");
};

export const deleteHabbit = async (
  ...args: Parameters<typeof apiDeleteHabbit>
): Promise<ReturnType<typeof apiDeleteHabbit>> => {
  await apiDeleteHabbit(...args);
  triggerSync("deleteHabbit");
};

export const updateHabitCount = async (
  ...args: Parameters<typeof apiUpdateHabitCount>
): Promise<ReturnType<typeof apiUpdateHabitCount>> => {
  const result = await apiUpdateHabitCount(...args);
  if (result) {
    triggerSync("updateHabitCount");
  }
  return result;
};

export const updateHabitNeedCount = async (
  ...args: Parameters<typeof apiUpdateHabitNeedCount>
): Promise<ReturnType<typeof apiUpdateHabitNeedCount>> => {
  const result = await apiUpdateHabitNeedCount(...args);
  if (result) {
    triggerSync("updateHabitNeedCount");
  }
  return result;
};

export const getHabits = async (
  ...args: Parameters<typeof apiGetHabits>
): Promise<ReturnType<typeof apiGetHabits>> => {
  const result = await apiGetHabits(...args);
  // no need to sync with spreadsheet
  return result;
};

export const getTodaySnapshot = async (
  ...args: Parameters<typeof apiGetTodaySnapshot>
): Promise<ReturnType<typeof apiGetTodaySnapshot>> => {
  const result = await apiGetTodaySnapshot(...args);
  // apiGetTodaySnapshot can create todays snapshot so sync
  if (result) {
    triggerSync("getTodaySnapshot");
  }
  return result;
};

export const saveDailySnapshot = async (
  ...args: Parameters<typeof apiSaveDailySnapshot>
): Promise<ReturnType<typeof apiSaveDailySnapshot>> => {
  const result = await apiSaveDailySnapshot(...args);
  if (result) {
    triggerSync("saveDailySnapshot");
  }
  return result;
};
