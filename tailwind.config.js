/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#39FF13',
        'neon-purple': '#8A00FF',
        'cyber-black': '#000000',
        'cyber-dark': '#111111',
        'cyber-medium': '#222222',
        'cyber-light': '#333333',
        'cyber-white': '#FFFFFF',
        'cyber-gray': '#CCCCCC',
        'cyber-dim': '#888888',
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'neon-ripple': 'neon-ripple 0.6s ease-out',
        'slide-in-cyber': 'slide-in-cyber 0.8s ease-out',
        'glitch': 'glitch 0.3s ease-in-out',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor' 
          },
          '50%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor' 
          },
        },
        'neon-ripple': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'slide-in-cyber': {
          from: { transform: 'translateX(100%) skewX(-10deg)', opacity: '0' },
          to: { transform: 'translateX(0) skewX(0deg)', opacity: '1' },
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '10%': { transform: 'translate(-2px, -2px)' },
          '20%': { transform: 'translate(2px, 2px)' },
          '30%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(2px, -2px)' },
          '50%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '70%': { transform: 'translate(-2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '90%': { transform: 'translate(-2px, -2px)' },
        },
      },
    },
  },
  plugins: [],
}