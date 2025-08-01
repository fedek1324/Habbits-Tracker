import IHabbit from "./types/habbit";
import IDailySnapshot from "./types/dailySnapshot";

// Storage keys for localStorage
const HABITS_STORAGE_KEY = "habits";
const DAILY_SNAPSHOTS_STORAGE_KEY = "dailySnapshots";

/**
 * Adds a new habit to localStorage
 * @param habit - habit object to add
 * @returns Promise<boolean> - true if addition is successful, false if error occurred
 */
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
      console.error("Habit with this id already exists:", habit.id);
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

export const getHabit = async (id: string): Promise<IHabbit| undefined> => {
  try {
    const habitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    let habbits: IHabbit[] = habitsJson ? JSON.parse(habitsJson) : [];
    let searchHabbit = habbits.find(h => h.id === id);
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

export const deleteHabbit = async (id: string): Promise<void> => {
  const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  const updated = habits.filter((habit: IHabbit) => habit.id !== id);
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
};

// Daily snapshots functions
export const getDailySnapshots = async (): Promise<IDailySnapshot[]> => {
  try {
    const snapshotsJson = localStorage.getItem(DAILY_SNAPSHOTS_STORAGE_KEY);
    return snapshotsJson ? JSON.parse(snapshotsJson) : [];
  } catch (error) {
    console.error("Error getting daily snapshots from localStorage:", error);
    return [];
  }
};

export const saveDailySnapshot = async (
  snapshot: IDailySnapshot
): Promise<boolean> => {
  try {
    const existingSnapshots = await getDailySnapshots();
    const updatedSnapshots = existingSnapshots.filter(
      (s) => s.date !== snapshot.date
    );
    updatedSnapshots.push(snapshot);

    localStorage.setItem(
      DAILY_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(updatedSnapshots)
    );
    return true;
  } catch (error) {
    console.error("Error saving daily snapshot:", error);
    return false;
  }
};

export const getTodaySnapshot = async (): Promise<IDailySnapshot> => {
  const today = new Date().toISOString().split('T')[0];
  const snapshots = await getDailySnapshots();
  let todaySnapshot = snapshots.find((s) => s.date === today);

  if (!todaySnapshot) {
    // Create today's snapshot if it doesn't exist
    const habits = await getHabits();
    const snapshots = await getDailySnapshots();

    if (snapshots.length === 0) {
      return {
        date: today,
        habbits: habits.map((h) => ({
          habbitId: h.id,
          habbitNeedCount: 1,
          habbitDidCount: 0,
        })),
      };
    }

    // Get previous day's need counts or use default
    const previousSnapshot = snapshots.sort((a, b) =>
      b.date.localeCompare(a.date)
    )[0];

    todaySnapshot = {
      date: today,
      habbits: previousSnapshot.habbits.map((h) => {
        return {
          habbitId: h.habbitId,
          habbitNeedCount: h.habbitNeedCount,
          habbitDidCount: 0,
        };
      }),
    };
  }

  return todaySnapshot;
};

// Helper function to get current need count for a habit
export const getCurrentNeedCount = async (habitId: string): Promise<number> => {
  const todaySnapshot = await getTodaySnapshot();

  const habit = todaySnapshot.habbits.find((h) => h.habbitId === habitId);
  return habit?.habbitNeedCount || 1;
};

// Helper function to get current actual count for a habit
export const getCurrentActualCount = async (
  habitId: string
): Promise<number> => {
  const todaySnapshot = await getTodaySnapshot();

  const habit = todaySnapshot.habbits.find((h) => h.habbitId === habitId);
  return habit?.habbitDidCount || 0;
};

// Update habit count in today's snapshot
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

// Update habit need count in today's snapshot
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
