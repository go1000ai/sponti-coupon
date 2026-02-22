import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FFF3E6",
          100: "#FFE0B3",
          200: "#FFCC80",
          300: "#FFB74D",
          400: "#FFA726",
          500: "#FF6B00",
          600: "#E65100",
          700: "#BF360C",
          800: "#992B09",
          900: "#732006",
        },
        secondary: {
          50: "#E8E8ED",
          100: "#C5C5D0",
          200: "#9E9EB3",
          300: "#777796",
          400: "#595980",
          500: "#1A1A2E",
          600: "#161628",
          700: "#121222",
          800: "#0E0E1C",
          900: "#0A0A16",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "countdown": "countdown 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
