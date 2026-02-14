/** @type {import('tailwindcss').Config} */
const { colors, darkColors } = require("./tailwind-theme");

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...colors,
        "dark-surface": darkColors.surface,
        "dark-border": darkColors.border,
        "dark-text": darkColors.text,
      },
    },
  },
  plugins: [],
};
