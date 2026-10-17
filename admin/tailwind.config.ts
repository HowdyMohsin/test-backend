import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Engine-room dark theme, shared with the public site.
        ink: "#06070b", // page background
        panel: "#0c0e14", // card background
        panel2: "#12151e", // raised card background
        line: "rgba(255,255,255,0.09)", // hairline borders
        acid: "#c8ff3d", // primary accent — electric lime
        aciddim: "#9fd41f",
        iris: "#8b7cff", // secondary accent — violet
        ember: "#ff6b4a", // warm accent / errors
        cyanx: "#4de3ff", // tertiary accent
        mist: "#98a2b8", // muted text
        paper: "#f2f5fa", // primary text
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        deck: "0 24px 80px -24px rgb(0 0 0 / 0.7)",
        glow: "0 0 0 1px rgb(200 255 61 / 0.25), 0 8px 40px -8px rgb(200 255 61 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
