/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      main: ["Poppins", "sans-serif"],
    },
    extend: {
      width: {
        main: "1280px",
      },
      gridTemplateRows: {

        '10': 'repeat(10, minmax(0, 1fr))',
        // Complex site-specific row configuration
        'layout': '200px minmax(900px, 1fr) 100px',
      },

      backgroundColor: {
        main: "#10B981",
        overlay: 'rgba(222,222,222,0.85)'
      },
      colors: {
        main: "#10B981",
      },
      flex: {
        2: "2 2 0%",
        3: "3 3 0%",
        4: "4 4 0%",
        5: "5 5 0%",
        6: "6 6 0%",
        7: "7 7 0%",
        8: "8 8 0%",
      },
      keyframes: {
        "scale-in-center": {
          "0%": {
            "-webkit-transform": "scale(0)",
            transform: "scale(0)"

          },
          "100%": {
            "-webkit-transform": "scale(1)",
            transform: "scale(1)",

          }
        },
        "slide-top": {
          "0%": {
            "-webkit-transform": "translateY(40px);",
            transform: "translateY(40px);",
          },
          "100%": {
            "-webkit-transform": "translateY(0);",
            transform: "translateY(0);",
          },
        },
        "slide-top-sm": {
          "0%": {
            "-webkit-transform": "translateY(8px);",
            transform: "translateY(8px);",
          },
          "100%": {
            "-webkit-transform": "translateY(0);",
            transform: "translateY(0);",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0;"
          },
          "100%": {
            opacity: "1;"
          }
        }
      },
      animation: {
        "slide-top":
          "slide-top 0.2s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;",
        "slide-top-sm":
          "slide-top-sm 0.2s linear both;",
        "fade-in":
          "fade-in 0.4s cubic-bezier(0.390, 0.575, 0.565, 1.000) both;",
        "scale-in-center":
          "scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")
  ]
};


