/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        'game-dark': '#0f0f23',
        'game-purple': '#6366f1',
        'game-blue': '#3b82f6',
      },
      backdropBlur: {
        'lg': '16px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-medium': 'float 4s ease-in-out infinite',
        'float-fast': 'float 3s ease-in-out infinite',
        'float-icon': 'floatIcon 8s ease-in-out infinite',
        'float-icon-delayed': 'floatIcon 8s ease-in-out infinite 2s',
        'float-icon-slow': 'floatIcon 10s ease-in-out infinite 4s',
        'fade-in': 'fadeIn 1s ease-out',
        'gradient-text': 'gradientText 3s ease-in-out infinite',
        'gradient-text-delayed': 'gradientText 3s ease-in-out infinite 1.5s',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)' },
        },
        floatIcon: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) translateX(5px) rotate(90deg)' },
          '50%': { transform: 'translateY(-5px) translateX(-5px) rotate(180deg)' },
          '75%': { transform: 'translateY(-15px) translateX(3px) rotate(270deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientText: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
