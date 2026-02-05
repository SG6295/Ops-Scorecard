import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        sand: '#f2efe7',
        clay: '#f4b266',
        sea: '#2b5d6b',
        haze: '#dfe7e3'
      }
    }
  },
  plugins: []
};

export default config;
