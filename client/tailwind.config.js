/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#F9F6EE',
          200: '#F2ECE0',
          300: '#E6DCCD',
          400: '#D5C4AE',
        },
        charcoal: {
          50: '#F6F7F7',
          100: '#E2E5E4',
          500: '#525F59',
          700: '#333D38',
          800: '#232A26',
          900: '#181E1B',
          950: '#0F1311',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Merriweather', 'serif'],
        urdu: ['Noto Nastaliq Urdu', 'Gulzar', 'Jameel Noori Nastaleeq', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(24, 30, 27, 0.05)',
        'soft-lg': '0 10px 30px -4px rgba(24, 30, 27, 0.08)',
        'soft-xl': '0 20px 40px -8px rgba(24, 30, 27, 0.12)',
      },
    },
  },
  plugins: [],
}
