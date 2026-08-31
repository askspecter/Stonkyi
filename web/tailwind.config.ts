import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0e0a",
        panel: "#0f1610",
        line: "#1c2a1c",
        acid: "#7dff4d",
        acidDim: "#4bbd2a",
        gold: "#ffd54a",
        ticker: "#0c120c",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(125,255,77,0.25)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
