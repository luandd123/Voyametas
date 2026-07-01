import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        voya: {
          rose: "rgb(var(--color-rose) / <alpha-value>)",
          roseDark: "rgb(var(--color-roseDark) / <alpha-value>)",
          cream: "rgb(var(--color-cream) / <alpha-value>)",
          charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
          gold: "rgb(var(--color-gold) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
