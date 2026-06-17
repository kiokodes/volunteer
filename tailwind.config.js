/** @type {import('tailwindcss').Config} */

// Tailwind CSS configuration - NextGem Foundation brand colors.
// Brand color: #0087ff (NextGem blue).
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - NextGem Blue (#0087ff)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0087ff', // Official NextGem brand color
          700: '#0070d6',
          800: '#005aad',
          900: '#004485',
        },
      },
    },
  },
  plugins: [],
};
