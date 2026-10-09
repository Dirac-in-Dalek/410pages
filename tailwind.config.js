import colors from './tailwind-compat-colors.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './shared/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    // Preserve existing sizing and colors when compiling with Tailwind 4.
    colors,
    borderRadius: {"none": "0px", "sm": "0.125rem", "DEFAULT": "0.25rem", "md": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "3xl": "1.5rem", "full": "9999px"},
    boxShadow: {"sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)", "DEFAULT": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)", "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)", "inner": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)", "none": "none"},
    blur: {"0": "0", "none": "", "sm": "4px", "DEFAULT": "8px", "md": "12px", "lg": "16px", "xl": "24px", "2xl": "40px", "3xl": "64px"},
    ringWidth: {"0": "0px", "1": "1px", "2": "2px", "4": "4px", "8": "8px", "DEFAULT": "3px"},

    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Noto Sans KR', 'Apple SD Gothic Neo', 'sans-serif'],
        serif: ['Noto Serif KR', 'Iowan Old Style', 'Times New Roman', 'serif'],
      },
      colors: {
        primary: '#37352F',
        secondary: '#6F6E69',
      }
    },
  },
  plugins: [],
}
