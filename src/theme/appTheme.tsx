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
  const [theme] = useState<ThemeMode>('light');

  useEffect(() => {
    Appearance.setColorScheme('light');
    void AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
  }, []);

  const setTheme = async (_nextTheme: ThemeMode) => {
    Appearance.setColorScheme('light');
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
  };

  const toggleTheme = async () => {
    await setTheme('light');
  };

  const value = useMemo(
    () => ({
      theme,
      isDark: false,
      palette: palettes.light,
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
