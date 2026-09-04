import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'vendor_theme_mode';

export type ThemePalette = {
  background: string;
  backgroundSoft: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  textMain: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
  heroGlow: string;
};

const palettes: Record<ThemeMode, ThemePalette> = {
  light: {
    background: '#F5F7F6',
    backgroundSoft: '#EEF4F0',
    surface: '#FFFFFF',
    surfaceElevated: '#F7FAF8',
    surfaceMuted: '#EDF3EF',
    border: '#DCE6DF',
    textMain: '#0F172A',
    textMuted: '#516072',
    textSubtle: '#718096',
    primary: '#1B7332',
    primarySoft: '#E6F4EA',
    primaryText: '#FFFFFF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#B91C1C',
    overlay: 'rgba(15, 23, 42, 0.08)',
    heroGlow: 'rgba(27, 115, 50, 0.12)',
  },
  dark: {
    background: '#08110D',
    backgroundSoft: '#0E1813',
    surface: '#111915',
    surfaceElevated: '#15211B',
    surfaceMuted: '#18251E',
    border: '#233229',
    textMain: '#F3F7F4',
    textMuted: '#A7B6AF',
    textSubtle: '#7F9188',
    primary: '#4CAF50',
    primarySoft: '#15361F',
    primaryText: '#07120A',
    success: '#34D399',
    warning: '#F59E0B',
    danger: '#F87171',
    overlay: 'rgba(0, 0, 0, 0.42)',
    heroGlow: 'rgba(76, 175, 80, 0.14)',
  },
};

type ThemeContextValue = {
  theme: ThemeMode;
  isDark: boolean;
  palette: ThemePalette;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) {
          return;
        }

        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeState(storedTheme);
          Appearance.setColorScheme(storedTheme);
        } else {
          const fallbackTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
          setThemeState(fallbackTheme);
          Appearance.setColorScheme(null);
        }
      } catch {
        if (mounted) {
          const fallbackTheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
          setThemeState(fallbackTheme);
        }
      } finally {
        if (mounted) {
          setHasLoadedPreference(true);
        }
      }
    };

    void loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPreference) {
      return;
    }

    Appearance.setColorScheme(theme);
  }, [hasLoadedPreference, theme]);

  const setTheme = async (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    Appearance.setColorScheme(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const toggleTheme = async () => {
    await setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      palette: palettes[theme],
      setTheme,
      toggleTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

export const appThemePalettes = palettes;
