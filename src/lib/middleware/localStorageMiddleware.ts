// import { Middleware } from '@reduxjs/toolkit';
// import { RootState } from '../store'; // ваш тип состояния
// import { initializeHabitsLocalStorage } from '@/src/app/services/apiLocalStorage'; // ваша функция

// export const localStorageMiddleware: Middleware<{}, RootState> = 
//   (store) => (next) => (action) => {
//     // Сначала пропускаем action дальше
//     const result = next(action);
    
//     // После обновления state сохраняем в localStorage
//     const state = store.getState();
//     initializeHabitsLocalStorage(
//       state.habits.items, // или state.yourSliceName.habits
//       state.notes.items,
//       state.snapshots.items
//     );
    
//     return result;
//   };