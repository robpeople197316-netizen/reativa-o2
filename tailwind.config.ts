import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep space background layers
        abyss: {
          950: "#01060d",
          900: "#03101c",
          800: "#061a2b",
          700: "#0a2740",
          600: "#0f3555",
        },
        // Primary HUD signal color
        hud: {
          50: "#e8fdff",
          100: "#c5f8ff",
          200: "#8ff0ff",
          300: "#4fe3ff",
          400: "#1fd0f5",
          500: "#06b0d8",
          600: "#028cae",
          700: "#076e88",
          800: "#0d596e",
          900: "#114a5c",
        },
        // Secondary / warning / beauty-sector accents
        plasma: "#7c5cff",
        ember: "#ff8a3d",
        rose: "#ff5c8a",
        acid: "#7cff9b",
        gold: "#e8c874",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-monospace", "monospace"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hud: "0 0 0 1px rgba(79,227,255,0.18), 0 0 24px -6px rgba(31,208,245,0.45)",
        "hud-lg":
          "0 0 0 1px rgba(79,227,255,0.28), 0 0 60px -10px rgba(31,208,245,0.7)",
        "inner-hud": "inset 0 0 30px -12px rgba(79,227,255,0.55)",
      },
      dropShadow: {
        glow: "0 0 8px rgba(79,227,255,0.75)",
        "glow-sm": "0 0 4px rgba(79,227,255,0.6)",
      },
      backgroundImage: {
        "grid-hud":
          "linear-gradient(rgba(79,227,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(79,227,255,0.055) 1px, transparent 1px)",
        "radial-core":
          "radial-gradient(circle at 50% 50%, rgba(79,227,255,0.55) 0%, rgba(6,176,216,0.25) 35%, rgba(3,16,28,0) 70%)",
        "vignette":
          "radial-gradient(ellipse at 50% 45%, rgba(3,16,28,0) 30%, rgba(1,6,13,0.85) 100%)",
      },
      backgroundSize: {
        "grid-hud": "44px 44px",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.65" },
          "70%": { transform: "scale(1.35)", opacity: "0" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "core-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.92" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        flicker: {
          "0%, 19%, 21%, 55%, 57%, 100%": { opacity: "1" },
          "20%, 56%": { opacity: "0.45" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-160" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 44s linear infinite",
        "spin-medium": "spin-slow 26s linear infinite",
        "spin-reverse": "spin-reverse 34s linear infinite",
        "pulse-ring": "pulse-ring 3.4s cubic-bezier(0.2,0.6,0.3,1) infinite",
        "core-breathe": "core-breathe 4.2s ease-in-out infinite",
        flicker: "flicker 6s linear infinite",
        scanline: "scanline 7s linear infinite",
        "dash-flow": "dash-flow 3s linear infinite",
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
