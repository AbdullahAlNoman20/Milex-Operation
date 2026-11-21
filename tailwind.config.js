/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '"Noto Sans SC"', '"Microsoft YaHei"', '"PingFang SC"', 'sans-serif'],
      },
      colors: {
        emerald: {
          500: '#10B981',
          600: '#059669', // Milex primary brand color
          700: '#047857',
        }
      }
    },
  },
  plugins: [],
}