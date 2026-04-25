/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,js}"],
  theme: {
    extend: {
      colors: {
        panel: "#fafafa",
        line: "#e5e5e5",
      },
    },
  },
  plugins: [],
};
