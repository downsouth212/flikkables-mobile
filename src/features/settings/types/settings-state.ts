export type Density = 'compact' | 'cozy' | 'spacious';

export type AppTheme = 'dark' | 'light';

export interface SettingsState {
  density: Density;
  setDensity: (density: Density) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}
