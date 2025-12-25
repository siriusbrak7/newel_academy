import { User } from './types';

export const SECURITY_QUESTIONS = [
  "What is the name of your first school?",
  "In which city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What is the name of your favorite childhood teacher?"
];

// ===== THEME CONFIGURATION =====
export const DEFAULT_THEME = 'Cosmic' as const;

export const THEMES = {
  COSMIC: 'Cosmic',
  CYBER_DYSTOPIAN: 'Cyber-Dystopian'
} as const;

export type ThemeType = typeof THEMES[keyof typeof THEMES];

export const THEME_CONFIGS = {
  [THEMES.COSMIC]: {
    name: 'Cosmic Explorer',
    description: 'Stars, planets & interstellar journey',
    icon: 'Star',
    color: 'cyan',
    primary: 'from-cyan-400 to-purple-400',
    bgClass: 'cosmic-theme',
    textClass: 'text-white',
    accentClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    glowClass: 'cosmic-text-glow',
    boxGlowClass: 'cosmic-box-glow',
    fontClass: 'font-sans',
    cssClass: 'cosmic-theme',
    htmlTheme: 'cosmic'
  },
  [THEMES.CYBER_DYSTOPIAN]: {
    name: 'Cyber-Dystopian',
    description: 'High-tech neon grids & matrix rain',
    icon: 'Cpu',
    color: 'green',
    primary: 'from-green-400 to-emerald-400',
    bgClass: 'cyber-theme',
    textClass: 'text-green-400',
    accentClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    glowClass: 'cyber-text-glow',
    boxGlowClass: 'cyber-box-glow',
    fontClass: 'font-mono',
    cssClass: 'cyber-theme',
    htmlTheme: 'cyber'
  }
} as const;

export const DEMO_USERS: User[] = [
  {
    username: 'admin',
    password: 'Cosmic2025!',
    role: 'admin',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[4],
    securityAnswer: 'newelacademy'
  },
  {
    username: 'teacher_demo',
    password: 'Teach123!',
    role: 'teacher',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: 'demo'
  },
  {
    username: 'student_demo',
    password: 'Learn123!',
    role: 'student',
    approved: true,
    gradeLevel: '12', 
    securityQuestion: SECURITY_QUESTIONS[1],
    securityAnswer: 'demo'
  }
];

// ===== APP CONSTANTS =====
export const APP_NAME = 'The Newel';
export const APP_VERSION = '1.2.0';
export const APP_TAGLINE = 'Ace Scientific Concepts';

// ===== DATABASE TABLE NAMES =====
export const DB_TABLES = {
  USERS: 'users',
  TOPICS: 'topics',
  QUESTIONS: 'questions',
  ASSESSMENTS: 'assessments',
  SUBMISSIONS: 'submissions',
  PROGRESS: 'user_progress',
  LEADERBOARDS: 'leaderboards',
  ANNOUNCEMENTS: 'announcements',
  MATERIALS: 'materials',
  CHECKPOINTS: 'checkpoints'
} as const;

// Helper functions
export const getThemeConfig = (theme: ThemeType) => {
  return THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME];
};

export const normalizeThemeForHTML = (theme: ThemeType): string => {
  if (theme === THEMES.CYBER_DYSTOPIAN) return 'cyber';
  if (theme === THEMES.COSMIC) return 'cosmic';
  return 'cosmic';
};