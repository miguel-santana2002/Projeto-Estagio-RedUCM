/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{html,ts}", "./node_modules/flowbite/**/*.js"],
  theme: {
    extend: {
      colors: {
        "redshift-red": "#E72230",
        "redshift-hover": "#c13e47",
      },
      fontFamily: {
        roboto: ["Roboto"],
        inter: ["Inter"],
        "open-sans": ["Open Sans"],
        poppins: ["Poppins"],
        "varela-round": ["Varela Round"],
      },
      keyframes: {
        myBounce: {
          "0%": {
            transform: "scaleX(1) scaleY(1)",
          },
          "50%": {
            transform: "scaleX(0.95) scaleY(0.95)",
          },
          "100%": {
            transform: "scaleX(1) scaleY(1)",
          },
        },
      },
      animation: {
        myBounceAnim: "myBounce 8s linear infinite",
      },
    },
  },
  plugins: [
    require("flowbite/plugin")({
      charts: true,
    }),
    require("preline/plugin"),
  ],
};
