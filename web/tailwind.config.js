/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:    'var(--c-primary)',
        'primary-dk': 'var(--c-primary-dk)',
        cgreen:     'var(--c-green)',
        cred:       'var(--c-red)',
        corange:    'var(--c-orange)',
        cgray:      'var(--c-gray)',
        separator:  'var(--c-separator)',
        cborder:    'var(--c-border)',
        cbg:        'var(--c-bg)',
        ccard:      'var(--c-card)',
        ctext:      'var(--c-text)',
        'text-sub': 'var(--c-text-sub)',
        'green-bg': 'var(--c-green-bg)',
        'red-bg':   'var(--c-red-bg)',
        'orange-bg':'var(--c-orange-bg)',
        'blue-bg':  'var(--c-blue-bg)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
