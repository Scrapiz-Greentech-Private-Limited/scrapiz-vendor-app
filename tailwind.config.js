/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        roboto: ["RobotoSlab_400Regular", "serif"],
        robotoBold: ["RobotoSlab_700Bold", "serif"],
        noto: ["NotoSans_400Regular", "sans-serif"],
        notoBold: ["NotoSans_700Bold", "sans-serif"],
        sans: ["NotoSans_400Regular", "sans-serif"],
        serif: ["RobotoSlab_400Regular", "serif"],
      },
    },
  },
  plugins: [],
}

