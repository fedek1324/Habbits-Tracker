import { Middleware } from '@reduxjs/toolkit';
import { initializeHabitsLocalStorage } from '@/src/app/services/apiLocalStorage'; // ваша функция

export const localStorageMiddleware: Middleware = 
  (store) => (next) => (action) => {
    // At first pass action down
    const result = next(action);
    
    // After state refresh update local storage
    // TODO check action types
    const state = store.getState();
    initializeHabitsLocalStorage(
      state.habits.items,
      state.notes.items,
      state.snapshots.items
    );
    
    return result;
  };