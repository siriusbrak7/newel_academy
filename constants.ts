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

