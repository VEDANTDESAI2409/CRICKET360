/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#124B36',
          primary: '#167A53',
          light: '#EAF5EF',
          surface: '#F3F5F4',
        },
        retail: {
          bg: '#F3F5F4',
          card: '#FFFFFF',
          text: '#18231D',
          muted: '#7A8580',
          border: '#E3E9E5',
          error: '#C83E4D',
          warning: '#D69A28',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(18, 75, 54, 0.04), 0 1px 2px 0 rgba(18, 75, 54, 0.02)',
        subtle: '0 4px 12px -2px rgba(18, 75, 54, 0.05)',
      }
    },
  },
  plugins: [],
}
