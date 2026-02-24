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
          50: "#FEF0EA",
          100: "#FCD9CA",
          200: "#F9B49A",
          300: "#F28E68",
          400: "#ED7844",
          500: "#E8632B",
          600: "#D05524",
          700: "#AB441C",
          800: "#863515",
          900: "#62260F",
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
        accent: {
          50: "#E9F6FC",
          100: "#C8EAF8",
          200: "#93D5F1",
          300: "#5CBFE9",
          400: "#3BB3E5",
          500: "#29ABE2",
          600: "#2499CB",
          700: "#1D7DA6",
          800: "#176281",
          900: "#11475D",
        },
        amber: {
          50: "#FEF6E6",
          100: "#FCE9BF",
          200: "#F9D88F",
          300: "#F7C75F",
          400: "#F5BA3F",
          500: "#F5A623",
          600: "#DC941E",
          700: "#B47918",
          800: "#8D5F12",
          900: "#66450D",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "countdown": "countdown 1s ease-in-out infinite",
        "fade-up": "fadeUp 0.7s ease-out forwards",
        "fade-in": "fadeIn 0.7s ease-out forwards",
        "slide-left": "slideLeft 0.7s ease-out forwards",
        "slide-right": "slideRight 0.7s ease-out forwards",
        "scale-up": "scaleUp 0.7s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "float-delayed": "float 3s ease-in-out infinite 1.5s",
        "bounce-subtle": "bounceSoft 2s ease-in-out infinite",
        "slide-up-fade": "slideUpFade 0.5s ease-out forwards",
        "glow": "glow 2s ease-in-out infinite",
        "wiggle": "wiggle 0.5s ease-in-out",
        "shimmer-slide": "shimmerSlide 1.5s ease-in-out",
        "gradient-x": "gradientX 3s ease infinite",
        "card-pop": "cardPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "price-count": "priceCount 0.8s ease-out forwards",
        "check-pop": "checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "border-glow": "borderGlow 3s ease-in-out infinite",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "float-slower": "floatSlow 8s ease-in-out infinite 2s",
        "pulse-soft": "pulseSoft 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(2rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(3rem)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-3rem)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(232, 99, 43, 0.3), 0 0 10px rgba(232, 99, 43, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(232, 99, 43, 0.5), 0 0 40px rgba(232, 99, 43, 0.2)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        shimmerSlide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        cardPop: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(180deg)' },
        },
        priceCount: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '60%': { opacity: '1', transform: 'translateY(-3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        checkPop: {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        borderGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(3deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
