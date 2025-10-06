import { configureStore } from '@reduxjs/toolkit';
import type { Action } from "@reduxjs/toolkit";

interface CounterState {
    value: number
}

function counterReducer(state: CounterState = {value: 1}, action: Action) {
    switch (action.type) {
        // handle actions here
        default:
            return state;
    }
}

export const makeStore = () => {
  return configureStore({
    reducer: {
        counter: counterReducer
    }
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']