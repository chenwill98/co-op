import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-great': '#508D69',
        'custom-good': '#9ADE7B',
        'custom-fair': '#EEF296',
        'custom-poor': '#FF8F8F',
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      'corporate', 'autumn',
    ],
  },
} satisfies Config;
