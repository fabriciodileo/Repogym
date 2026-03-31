import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f8fb',
          100: '#eef1f7',
          200: '#d6dce9',
          300: '#b0bdd4',
          400: '#7f93b5',
          500: '#5f7396',
          600: '#495b7b',
          700: '#3a4964',
          800: '#27324a',
          900: '#161e31',
        },
        sand: '#f6efe7',
        ember: '#c46b2d',
        mint: '#2d9b7b',
        danger: '#c23b33',
        warning: '#c88f16',
      },
      boxShadow: {
        panel: '0 18px 48px rgba(22, 30, 49, 0.12)',
      },
      backgroundImage: {
        dashboard:
          'radial-gradient(circle at top left, rgba(196, 107, 45, 0.18), transparent 32%), radial-gradient(circle at top right, rgba(45, 155, 123, 0.16), transparent 28%), linear-gradient(180deg, #f8f4ee 0%, #f1f5fb 48%, #ffffff 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
