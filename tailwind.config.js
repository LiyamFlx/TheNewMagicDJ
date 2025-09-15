/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enhanced neon colors with better contrast
        'neon-green': '#00FF41',
        'neon-green-bright': '#39FF14',
        'neon-green-dim': '#00CC33',
        'neon-purple': '#9D00FF',
        'neon-purple-bright': '#B347FF',
        'neon-purple-dim': '#7A00CC',
        'neon-blue': '#00D4FF',
        'neon-orange': '#FF6B00',
        'neon-pink': '#FF0080',
        
        // Refined cyber colors
        'cyber-black': '#000000',
        'cyber-dark': '#0A0A0A',
        'cyber-darker': '#050505',
        'cyber-medium': '#1A1A1A',
        'cyber-light': '#2A2A2A',
        'cyber-lighter': '#3A3A3A',
        'cyber-white': '#FFFFFF',
        'cyber-gray': '#E0E0E0',
        'cyber-gray-dim': '#B0B0B0',
        'cyber-dim': '#808080',
        
        // DJ-specific colors
        'deck-a': '#00FF41',
        'deck-b': '#9D00FF',
        'crossfader': '#00D4FF',
        'cue-point': '#FF6B00',
        'loop': '#FF0080',
      },
      fontFamily: {
        'dj': ['Orbitron', 'Exo 2', 'Rajdhani', 'monospace'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'neon-pulse-fast': 'neon-pulse 1s ease-in-out infinite',
        'neon-ripple': 'neon-ripple 0.6s ease-out',
        'slide-in-cyber': 'slide-in-cyber 0.8s ease-out',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'glitch': 'glitch 0.3s ease-in-out',
        'pulse-light': 'pulse-light 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'waveform': 'waveform 1.5s ease-in-out infinite',
        'energy-flow': 'energy-flow 2s linear infinite',
        'deck-glow': 'deck-glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            filter: 'brightness(1)'
          },
          '50%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor',
            filter: 'brightness(1.2)'
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
        'slide-in-left': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
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
        'pulse-light': {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'waveform': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'energy-flow': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'deck-glow': {
          '0%': { 
            boxShadow: '0 0 20px currentColor, inset 0 0 20px rgba(255,255,255,0.1)' 
          },
          '100%': { 
            boxShadow: '0 0 40px currentColor, inset 0 0 40px rgba(255,255,255,0.2)' 
          },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'neon-green': '0 0 20px #00FF41, 0 0 40px #00FF41, 0 0 60px #00FF41',
        'neon-purple': '0 0 20px #9D00FF, 0 0 40px #9D00FF, 0 0 60px #9D00FF',
        'neon-blue': '0 0 20px #00D4FF, 0 0 40px #00D4FF, 0 0 60px #00D4FF',
        'deck-shadow': '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'control-shadow': '0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
      },
    },
  },
  plugins: [],
}