import { User, Question } from './types';

export const SECURITY_QUESTIONS = [
  "What is the name of your first school?",
  "In which city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What is the name of your favorite childhood teacher?"
];

export const DEFAULT_THEME = 'Cosmic' as const;

// Theme definitions
export const THEMES = {
  COSMIC: 'Cosmic',
  CYBER_DYSTOPIAN: 'Cyber-Dystopian'
} as const;

export type ThemeType = typeof THEMES[keyof typeof THEMES];

// Theme configurations for UI components
export const THEME_CONFIGS = {
  [THEMES.COSMIC]: {
    name: 'Cosmic Explorer',
    description: 'Stars, planets & interstellar journey',
    icon: 'Star',
    color: 'cyan',
    primary: 'from-cyan-400 to-purple-400',
    bgClass: 'cosmic-bg',
    textClass: 'text-white',
    accentClass: 'text-cyan-400'
  },
  [THEMES.CYBER_DYSTOPIAN]: {
    name: 'Cyber-Dystopian',
    description: 'Neon grids & matrix rain',
    icon: 'Cpu',
    color: 'green',
    primary: 'from-green-400 to-emerald-400',
    bgClass: 'cyber-bg',
    textClass: 'text-green-400',
    accentClass: 'text-green-400',
    fontClass: 'font-mono'
  }
};

// DEMO USER CREDENTIALS - For development/testing only
// In production, these should be removed and users should register via auth system
export const DEMO_USERS: Omit<User, 'password'>[] = [
  {
    username: 'admin',
    role: 'admin',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[4],
    securityAnswer: 'newelacademy',
    tier: 'admin_free',
    queryCount: 0,
    queryResetTime: new Date().toISOString(),
    isPremium: true,
    createdAt: Date.now(),
    status: 'active'
  },
  {
    username: 'teacher_demo',
    role: 'teacher',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: 'demo',
    tier: 'free',
    queryCount: 0,
    queryResetTime: new Date().toISOString(),
    isPremium: false,
    createdAt: Date.now(),
    status: 'active'
  },
  {
    username: 'student_demo',
    role: 'student',
    approved: true,
    gradeLevel: '12', 
    securityQuestion: SECURITY_QUESTIONS[1],
    securityAnswer: 'demo',
    tier: 'free',
    queryCount: 0,
    queryResetTime: new Date().toISOString(),
    isPremium: false,
    createdAt: Date.now(),
    status: 'active'
  }
];

// Development environment check
export const IS_DEV_MODE = process.env.NODE_ENV === 'development';

// Authentication configuration
export const AUTH_CONFIG = {
  // In production, this should be false and all auth should go through Supabase
  ALLOW_DEMO_LOGIN: IS_DEV_MODE,
  
  // Password requirements for user registration
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  
  // Security configuration
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
};
