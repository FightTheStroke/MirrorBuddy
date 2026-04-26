'use client';

import { create } from 'zustand';

export type CalculatorMode = 'simple' | 'scientific' | 'graph';

export interface CalculatorState {
  mode: CalculatorMode;
  display: string;
  expression: string;
  history: string[];
  graphFunction: string;
  isOpen: boolean;
}

interface CalculatorStore extends CalculatorState {
  setMode: (mode: CalculatorMode) => void;
  setDisplay: (value: string) => void;
  setExpression: (expr: string) => void;
  setGraphFunction: (fn: string) => void;
  addToHistory: (entry: string) => void;
  clearHistory: () => void;
  clear: () => void;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCalculatorStore = create<CalculatorStore>()((set) => ({
  mode: 'simple',
  display: '0',
  expression: '',
  history: [],
  graphFunction: 'x^2',
  isOpen: false,

  setMode: (mode) => set({ mode }),

  setDisplay: (value) => set({ display: value }),

  setExpression: (expr) => set({ expression: expr }),

  setGraphFunction: (fn) => set({ graphFunction: fn }),

  addToHistory: (entry) =>
    set((state) => ({
      history: [...state.history.slice(-9), entry],
    })),

  clearHistory: () => set({ history: [] }),

  clear: () => set({ display: '0', expression: '' }),

  setIsOpen: (open) => set({ isOpen: open }),

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
