import { create } from 'zustand';

type Theme = 'dark' | 'light';

const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('pn-theme')) as Theme | null;

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('pn-theme', theme);
}

export const useTheme = create<ThemeState>((set, get) => {
  const initial: Theme = stored ?? 'dark';
  if (typeof document !== 'undefined') apply(initial);
  return {
    theme: initial,
    toggle: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      apply(next);
      set({ theme: next });
    },
  };
});
