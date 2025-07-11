import IHabbit from "./types/habbit";

// Ключ для хранения привычек в localStorage
const HABITS_STORAGE_KEY = 'habits';

/**
 * Добавляет новую привычку в localStorage
 * @param habit - объект привычки для добавления
 * @returns Promise<boolean> - true если добавление успешно, false если произошла ошибка
 */
export const addHabit = async (habit: IHabbit): Promise<boolean> => {
    try {
      // Получаем существующие привычки из localStorage
      const existingHabitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
      const existingHabits: IHabbit[] = existingHabitsJson ? JSON.parse(existingHabitsJson) : [];

      // Проверяем, не существует ли уже привычка с таким id
      const habitExists = existingHabits.some(existingHabit => existingHabit.id === habit.id);
      if (habitExists) {
        console.error('Привычка с таким id уже существует:', habit.id);
        return false;
      }

      // Добавляем новую привычку
      const updatedHabits = [...existingHabits, habit];

      // Сохраняем обновленный список в localStorage
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(updatedHabits));

      console.log('Привычка успешно добавлена:', habit);
      return true;

    } catch (error) {
      console.error('Ошибка при добавлении привычки в localStorage:', error);
      return false;
    }
};

// Дополнительная функция для получения всех привычек
export const getHabits = async (): Promise<IHabbit[]> => {
  try {
    const habitsJson = localStorage.getItem(HABITS_STORAGE_KEY);
    return habitsJson ? JSON.parse(habitsJson) : [];
  } catch (error) {
    console.error('Ошибка при получении привычек из localStorage:', error);
    return [];
  }
};

// Пример использования:
/*
const newHabit: IHabbit = {
  id: crypto.randomUUID(), // или любой уникальный id
  text: "Пить 2 литра воды в день",
  currentCount: 0,
  needCount: 2
};

addHabitToStorage(newHabit)
  .then(success => {
    if (success) {
      console.log('Привычка добавлена успешно!');
    } else {
      console.log('Не удалось добавить привычку');
    }
  });
*/