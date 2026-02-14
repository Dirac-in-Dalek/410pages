/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './Auth.tsx',
    './index.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
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
