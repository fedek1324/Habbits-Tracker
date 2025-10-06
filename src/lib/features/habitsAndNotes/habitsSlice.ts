import IHabbit from "@/src/app/types/habbit";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";

interface HabitsState {
  items: IHabbit[];
}

const initialState: HabitsState = {
  items: [],
};

const habitsSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {
    setHabits: (state, action: PayloadAction<IHabbit[]>) => {
      state.items = action.payload;
    },
    addHabit: (state, action: PayloadAction<IHabbit>) => {
      state.items.push(action.payload);
    },
    updateHabit: (state, action: PayloadAction<IHabbit>) => {
      const habitIndex = state.items.findIndex(
        (h) => h.id === action.payload.id
      );
      if (habitIndex !== -1) {
        state.items[habitIndex] = action.payload;
      }
    },
  },
});

export const { setHabits, addHabit, updateHabit } = habitsSlice.actions;

// Selectors (like getHabits, getHabit)
export const selectAllHabits = (state: RootState) => state.habits.items;
export const selectHabitById = (state: RootState, habitId: string) =>
  state.habits.items.find((h) => h.id === habitId);

export default habitsSlice.reducer;
