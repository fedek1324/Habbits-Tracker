import INote from "@/src/app/types/note";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";

interface NotesState {
  items: INote[];
}

const initialState: NotesState = {
  items: [],
};

const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    setNotes: (state, action: PayloadAction<INote[]>) => {
      state.items = action.payload;
    },
    addNote: (state, action: PayloadAction<INote>) => {
      state.items.push(action.payload);
    },
    updateNote: (state, action: PayloadAction<INote>) => {
      const noteIndex = state.items.findIndex(
        (n) => n.id === action.payload.id
      );
      if (noteIndex !== -1) {
        state.items[noteIndex] = action.payload;
      }
    },
  },
});

export const { setNotes, addNote, updateNote } = notesSlice.actions;

// Selectors
export const selectAllNotes = (state: RootState) => state.notes.items;
export const selectNoteById = (state: RootState, noteId: string) =>
  state.notes.items.find(n => n.id === noteId);

export default notesSlice.reducer;
