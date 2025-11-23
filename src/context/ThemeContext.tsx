import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  colors: typeof lightColors;
}

const lightColors = {
  primary: '#007AFF', // iOS blue
  primaryLight: '#33A1FF',
  primaryDark: '#0055C9',
  accent: '#0A84FF',
  secondary: '#1C1C1E',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FFCC00',
  info: '#64D2FF',
  background: {
    primary: '#F5F5F7',
    secondary: '#FFFFFF',
    tertiary: '#EBEBF0',
    card: '#FFFFFF',
    glass: 'rgba(255,255,255,0.9)',
  },
  text: {
    primary: '#1C1C1E',
    secondary: '#3A3A3C',
    tertiary: '#6E6E73',
    light: '#FFFFFF',
    muted: '#8E8E93',
  },
  border: {
    light: '#E5E5EA',
    medium: '#D1D1D6',
    dark: '#C7C7CC',
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 12,
    },
  },
};

const darkColors = {
  primary: '#0A84FF',
  primaryLight: '#33A1FF',
  primaryDark: '#0060DF',
  accent: '#64D2FF',
  secondary: '#2C2C2E',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FFD60A',
  info: '#64D2FF',
  background: {
    primary: '#0C0C0D',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
    card: '#1C1C1E',
    glass: 'rgba(28,28,30,0.92)',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#DADADA',
    tertiary: '#8E8E93',
    light: '#FFFFFF',
    muted: '#AEAEB2',
  },
  border: {
    light: '#2C2C2E',
    medium: '#3A3A3C',
    dark: '#48484A',
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 14,
    },
  },
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (mode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
  }, [mode, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('themeMode');
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setModeState(savedMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', newMode);
      setModeState(newMode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return a safe default instead of throwing during initialization
    return {
      mode: 'auto' as ThemeMode,
      isDark: false,
      setMode: async () => { },
      colors: lightColors,
    };
  }
  return context;
}
