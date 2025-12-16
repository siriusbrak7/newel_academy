module.exports = {
  content: ["./**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}

// In your tailwind.config script in index.html, add these extensions:
extend: {
  animation: {
    'theme-pulse': 'themePulse 2s ease-in-out infinite',
    'theme-switch': 'themeSwitch 0.5s ease-out',
  },
  keyframes: {
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
