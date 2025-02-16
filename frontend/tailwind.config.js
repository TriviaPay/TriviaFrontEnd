/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: ["class"],
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#A200FF",
        background: "#120A23",
        inputBg: "#3C374680",
        buttonBg: "#C000FF",
        textWhite: "#FFFFFF",
        textGray: "#CCCCCC",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
