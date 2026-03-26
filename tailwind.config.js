import { createTailwindConfig } from 'tailwindcss/defaultConfig';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#ea580c',
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
