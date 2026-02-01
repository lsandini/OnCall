/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'clinic': {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5ceac9',
          400: '#2ad4b0',
          500: '#0fb897',
          600: '#09957b',
          700: '#0b7764',
          800: '#0e5e51',
          900: '#104d44',
        },
        'steel': {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b1bac9',
          400: '#8795ab',
          500: '#687890',
          600: '#536077',
          700: '#444e61',
          800: '#3b4352',
          900: '#343a46',
        }
      },
      fontFamily: {
        'display': ['"DM Sans"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'sharp': '4px 4px 0px 0px rgba(0,0,0,0.1)',
        'sharp-lg': '6px 6px 0px 0px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
