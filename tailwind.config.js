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
        sans: ['IBM Plex Sans', 'Noto Sans KR', 'Avenir Next', 'Segoe UI', 'sans-serif'],
        serif: ['Newsreader', 'Noto Serif KR', 'Iowan Old Style', 'Times New Roman', 'serif'],
      },
      colors: {
        primary: '#1D5A72',
        secondary: '#6F675C',
      }
    },
  },
  plugins: [],
}
