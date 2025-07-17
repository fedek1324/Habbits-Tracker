import IHabbit from "./types/habbit";

// Storage key for habits in localStorage
const HABITS_STORAGE_KEY = 'habits';
const HABITS_RESET_DATE_STORAGE_KEY = 'habitsResetDate';

/**
 * Adds a new habit to localStorage
 * @param habit - habit object to add
 * @returns Promise<boolean> - true if addition is successful, false if error occurred
 */
export const addHabit = async (habit: IHabbit): Promise<boolean> => {
    try {
      // Get existing habits from localStorage
      const existingHabitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
      const existingHabits: IHabbit[] = existingHabitsJson ? JSON.parse(existingHabitsJson) : [];

      // Check if habit with this id already exists
      const habitExists = existingHabits.some(existingHabit => existingHabit.id === habit.id);
      if (habitExists) {
        console.error('Habit with this id already exists:', habit.id);
        return false;
      }

      // Add new habit
      const updatedHabits = [...existingHabits, habit];

      // Save updated list to localStorage
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updatedHabits));

      console.log('Habit successfully added:', habit);
      return true;

    } catch (error) {
      console.error('Error adding habit to localStorage:', error);
      return false;
    }
};

// Additional function to get all habits
export const getHabits = async (): Promise<IHabbit[]> => {
  try {
    const habitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    return habitsJson ? JSON.parse(habitsJson) : [];
  } catch (error) {
    console.error('Error getting habits from localStorage:', error);
    return [];
  }
};

export const updateHabit = async (updatedHabit: IHabbit): Promise<void> => {
  const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  const updated = habits.map((habit: IHabbit) =>
    habit.id === updatedHabit.id ? updatedHabit : habit
  );
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updated));
}

export const getLastResetDate = async (): Promise<string | null> => {
  try {
    const habitsResetDateJson = localStorage.getItem(HABITS_RESET_DATE_STORAGE_KEY);
    return habitsResetDateJson ? JSON.parse(habitsResetDateJson) : null;
  } catch (error) {
    console.error('Error getting habits from localStorage:', error);
    return null;
  }
};

export const setLastResetDate = async (date: string): Promise<void> => {
  try {
    localStorage.setItem(HABITS_RESET_DATE_STORAGE_KEY, JSON.stringify(date));
  } catch (error) {
    console.error('Error getting habits from localStorage:', error);
    return;
  }
};