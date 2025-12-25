// src/providers/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types';
import { DEFAULT_THEME } from '../constants';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Sync with HTML theme manager
    const htmlTheme = window.ThemeManager?.getCurrentTheme();
    if (htmlTheme) {
      setCurrentTheme(htmlTheme);
    }
  }, []);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    window.ThemeManager?.setTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};