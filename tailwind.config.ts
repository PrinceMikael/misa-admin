import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#17cf63',
        'primary-dark': '#12a84f',
        'background-light': '#f6f8f7',
        'background-dark': '#112118',
      },
    },
  },
  plugins: [],
};

export default config;
