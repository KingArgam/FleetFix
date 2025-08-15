

export const themes = {
  light: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    border: '#e2e8f0'
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    border: '#334155'
  }
};

export type Theme = keyof typeof themes;

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  const themeColors = themes[theme];
  
  Object.entries(themeColors).forEach(([key, value]: [string, string]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
};

export const getCurrentTheme = (): Theme => {
  return (localStorage.getItem('fleetfix-theme') as Theme) || 'light';
};

export const setTheme = (theme: Theme): void => {
  localStorage.setItem('fleetfix-theme', theme);
  applyTheme(theme);
};

export {};
