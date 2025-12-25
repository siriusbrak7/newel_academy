// Add to your types.ts or create global.d.ts
export {};

declare global {
  interface Window {
    ThemeManager?: {
      setTheme: (theme: string) => void;
      getCurrentTheme: () => string;
      getCurrentCssClass: () => string;
      applyThemeClasses: (element: HTMLElement, theme: string) => void;
    };
  }
}