import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6F5BFF',
          foreground: '#F6F4FF',
          dark: '#4A3CC9',
          light: '#EAE6FF'
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      boxShadow: {
        glass: '0 20px 45px -20px rgba(111, 91, 255, 0.45)'
      }
    }
  },
  plugins: []
};

export default config;
