/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wiki: {
          blue: '#0645ad',
          lightblue: '#36c',
          gray: '#f8f9fa',
          darkgray: '#54595d',
        },
      },
    },
  },
  plugins: [],
};
