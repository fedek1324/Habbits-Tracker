import IHabbit from "./types/habbit";
import IDailySnapshot from "./types/dailySnapshot";

// Storage keys for localStorage
const HABITS_STORAGE_KEY = "habits";
const DAILY_SNAPSHOTS_STORAGE_KEY = "dailySnapshots";

/**
 * Adds a new habit to localStorage
 * */
export const addHabit = async (habit: IHabbit): Promise<boolean> => {
  try {
    // Get existing habits from localStorage
    const existingHabitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    const existingHabits: IHabbit[] = existingHabitsJson
      ? JSON.parse(existingHabitsJson)
      : [];

    // Check if habit with this id already exists
    const habitExists = existingHabits.some(
      (existingHabit) => existingHabit.id === habit.id
    );
    if (habitExists) {
      // console.error("Habit with this id already exists:", habit.id);
      return false;
    }

    // Add new habit
    const updatedHabits = [...existingHabits, habit];

    // Save updated list to localStorage
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updatedHabits));

    console.log("Habit successfully added:", habit);
    return true;
  } catch (error) {
    console.error("Error adding habit to localStorage:", error);
    return false;
  }
};

// Additional function to get all habits
export const getHabits = async (): Promise<IHabbit[]> => {
  try {
    const habitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    return habitsJson ? JSON.parse(habitsJson) : [];
  } catch (error) {
    console.error("Error getting habits from localStorage:", error);
    return [];
  }
};

export const getHabit = async (id: string): Promise<IHabbit | undefined> => {
  try {
    const habitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    let habbits: IHabbit[] = habitsJson ? JSON.parse(habitsJson) : [];
    let searchHabbit = habbits.find((h) => h.id === id);
    return searchHabbit;
  } catch (error) {
    console.error("Error getting habits from localStorage:", error);
    return undefined;
  }
};

export const updateHabit = async (updatedHabit: IHabbit): Promise<void> => {
  const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  const updated = habits.map((habit: IHabbit) =>
    habit.id === updatedHabit.id ? updatedHabit : habit
  );
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
};

/**
 * delete Habbit in todays' snapshot
 */
export const deleteHabbit = async (id: string): Promise<void> => {
  const todaySnapshot = await getTodaySnapshot();
  todaySnapshot.habbits = todaySnapshot.habbits.filter((h) => h.habbitId !== id);
  await saveDailySnapshot(todaySnapshot);
  // const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  // const updated = habits.filter((habit: IHabbit) => habit.id !== id);
  // localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));

};

/**
 * Daily snapshots functions
 */
const getDailySnapshotsRaw = async (): Promise<IDailySnapshot[]> => {
  try {
    const snapshotsJson = localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY);
    return snapshotsJson ? JSON.parse(snapshotsJson) : [];
  } catch (error) {
    console.error("Error getting daily snapshots from localStorage:", error);
    return [];
  }
};

export const getDailySnapshots = async (): Promise<IDailySnapshot[]> => {
  await fillHistory();
  return getDailySnapshotsRaw();
};

export const saveDailySnapshot = async (
  snapshot: IDailySnapshot
): Promise<boolean> => {
  try {
    const existingSnapshots = await getDailySnapshotsRaw();

    // If no existing snapshots, just add the first one
    if (existingSnapshots.length === 0) {
      existingSnapshots.push(snapshot);
    } else {
      // Insert at proper position
      for (let i = 0; i < existingSnapshots.length; i++) {
        const element = existingSnapshots[i];
        let isSameDay = element.date === snapshot.date;
        let isAfterSnapshot = new Date(element.date) > new Date(snapshot.date);
        let isLastElement = i === existingSnapshots.length - 1;
        
        if (isSameDay) {
          existingSnapshots[i] = snapshot;
          break;
        } else if (isAfterSnapshot) {
          existingSnapshots.splice(i, 0, snapshot);
          break;
        } else if (isLastElement) {
          existingSnapshots.push(snapshot);
          break;
        }
      }
    }

    localStorage.setItem(
      DAILY_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(existingSnapshots)
    );
    return true;
  } catch (error) {
    console.error("Error saving daily snapshot:", error);
    return false;
  }
};

/**
 * Also creates snapshot if it did not exist
 */
export const getTodaySnapshot = async (): Promise<IDailySnapshot> => {
  const today = new Date().toISOString().split("T")[0];
  const snapshots = await getDailySnapshotsRaw();
  let todaySnapshot = snapshots.find((s) => s.date === today);

  if (!todaySnapshot) {
    // Create today's snapshot if it doesn't exist
    if (snapshots.length === 0) {
      // No previous snapshots - create empty snapshot that will be populated when habits are added
      todaySnapshot = {
        date: today,
        habbits: [],
      };
    } else {
      // Get previous day's snapshot and reset counts to 0
      const previousSnapshot = snapshots.sort((a, b) =>
        b.date.localeCompare(a.date)
      )[0];

      todaySnapshot = {
        date: today,
        habbits: previousSnapshot.habbits.map((h) => ({
          habbitId: h.habbitId,
          habbitNeedCount: h.habbitNeedCount,
          habbitDidCount: 0,
        })),
      };
    }
    
    // Save the new snapshot
    await saveDailySnapshot(todaySnapshot);
  }

  return todaySnapshot;
};

/**
 * If there are empty days from last snapshot day and today, fill theese days with snapshots
 * so we will understand lates that there were habbits but they were not incremented
 */
export const fillHistory = async (): Promise<void> => {
  // create todays snapshot to be sure it is created
  await getTodaySnapshot();

  // todat with time 00.00.00 for correct currentDate < today compare
  const today = new Date(new Date().toISOString().split("T")[0]);
  let previousSnapshot;
  const snapshots = await getDailySnapshotsRaw();

  if (snapshots.length > 1) {
    previousSnapshot = snapshots.sort((a, b) =>
      b.date.localeCompare(a.date)
    )[1];

    let currentDate = new Date(previousSnapshot.date);
    currentDate.setDate(currentDate.getDate() + 1);

    while (currentDate < today) {
      let date = currentDate.toISOString().split("T")[0];
      let snapshot = {
        date: date,
        habbits: previousSnapshot.habbits.map((h) => {
          return {
            habbitId: h.habbitId,
            habbitNeedCount: h.habbitNeedCount,
            habbitDidCount: 0,
          };
        }),
      };

      await saveDailySnapshot(snapshot);

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
};

/**
 * Helper function to get current need count for a habit
 */
export const getCurrentNeedCount = async (habitId: string): Promise<number> => {
  const todaySnapshot = await getTodaySnapshot();

  const habit = todaySnapshot.habbits.find((h) => h.habbitId === habitId);
  return habit?.habbitNeedCount || 1;
};

/**
 * Helper function to get current actual count for a habit
 */
export const getCurrentActualCount = async (
  habitId: string
): Promise<number> => {
  const todaySnapshot = await getTodaySnapshot();

  const habit = todaySnapshot.habbits.find((h) => h.habbitId === habitId);
  return habit?.habbitDidCount || 0;
};

/**
 * Update habit count in today's snapshot
 */
export const updateHabitCount = async (
  habitId: string,
  newCount: number
): Promise<boolean> => {
  try {
    let todaySnapshot = await getTodaySnapshot();

    // Update the specific habit count
    const habitIndex = todaySnapshot.habbits.findIndex(
      (h) => h.habbitId === habitId
    );
    if (habitIndex !== -1) {
      todaySnapshot.habbits[habitIndex].habbitDidCount = newCount;
    }

    return await saveDailySnapshot(todaySnapshot);
  } catch (error) {
    console.error("Error updating habit count:", error);
    return false;
  }
};

/**
 * Update habit need count in today's snapshot
 */
export const updateHabitNeedCount = async (
  habitId: string,
  newNeedCount: number
): Promise<boolean> => {
  try {
    let todaySnapshot = await getTodaySnapshot();

    const habitIndex = todaySnapshot.habbits.findIndex(
      (h) => h.habbitId === habitId
    );
    if (habitIndex !== -1) {
      todaySnapshot.habbits[habitIndex].habbitNeedCount = newNeedCount;
    }

    return await saveDailySnapshot(todaySnapshot);
  } catch (error) {
    console.error("Error updating habit need count:", error);
    return false;
  }
};
