

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.{js,jsx,ts,tsx}", './src/**/*.{js,jsx,ts,tsx}',],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins-Regular"],
        poppinsBold: ["Poppins-Bold"],
        poppinsItalic: ["Poppins-Italic"],
      },
    },
  },
  plugins: [],
};
