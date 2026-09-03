import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07080a",
        coal: "#0c0e10",
        panel: "#101316",
        line: "#20262a",
        mist: "#8b9591",
        acid: "#c8f24e",
        acidDim: "#8fae3a",
        gold: "#e8b84b",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(200,242,78,0.28)",
        card: "0 30px 80px -20px rgba(0,0,0,0.7)",
      },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        marqueeFast: "marquee 20s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
        spinSlow: "spinSlow 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
