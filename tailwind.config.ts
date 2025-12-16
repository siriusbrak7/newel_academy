import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rocket-fly': 'rocketFly 8s ease-in-out infinite',
        'asteroid-drift': 'asteroidDrift 15s linear infinite',
        'matrix-fall': 'matrixFall 20s linear infinite',
        'theme-pulse': 'themePulse 2s ease-in-out infinite',
        'theme-switch': 'themeSwitch 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(2deg)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(100px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(100px) rotate(-360deg)' },
        },
        rocketFly: {
          '0%': { transform: 'translate(0, 0) rotate(-45deg)' },
          '50%': { transform: 'translate(100px, -100px) rotate(-45deg)' },
          '100%': { transform: 'translate(0, 0) rotate(-45deg)' },
        },
        asteroidDrift: {
          '0%': { transform: 'translateX(-100px) rotate(0deg)' },
          '100%': { transform: 'translateX(calc(100vw + 100px)) rotate(360deg)' },
        },
        matrixFall: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        themePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.95)' },
        },
        themeSwitch: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
};

export default config;