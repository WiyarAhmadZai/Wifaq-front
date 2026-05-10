/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — anchored on the dark teal from the design.
        // teal-600 is the primary brand color used across the app, so it
        // matches the target color exactly. The other shades are derived
        // around it so existing classes (teal-50 … teal-900) stay coherent.
        teal: {
          50:  '#e1eae9',
          100: '#b8cdcb',
          200: '#83a8a4',
          300: '#4d827d',
          400: '#1f5f5a',
          500: '#0c403d',
          600: '#062525',
          700: '#041818',
          800: '#030f0f',
          900: '#020909',
          950: '#010404',
        },
        // Slightly tone emerald to match — used mostly in gradients next to teal.
        emerald: {
          50:  '#e3ece8',
          100: '#bcd1c7',
          200: '#88ad9c',
          300: '#548a72',
          400: '#286a4f',
          500: '#0f4830',
          600: '#082d1e',
          700: '#062014',
          800: '#04150d',
          900: '#020c07',
          950: '#010604',
        },
      },
    },
  },
  plugins: [],
}
