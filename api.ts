import IHabbit from "./types/habbit";

// Storage key for habits in localStorage
const HABITS_STORAGE_KEY = 'habits';

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