import type { Config } from "tailwindcss";

/** Tailwind maps the CSS-variable design tokens (app/globals.css). */
const token = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: token("--background"),
        surface: token("--surface"),
        "surface-raised": token("--surface-raised"),
        border: token("--border"),
        text: token("--text"),
        "text-muted": token("--text-muted"),
        primary: token("--primary"),
        "primary-hover": token("--primary-hover"),
        "primary-contrast": token("--primary-contrast"),
        accent: token("--accent"),
        success: token("--success"),
        warning: token("--warning"),
        danger: token("--danger"),
        ring: token("--ring"),
        // LEGACY — only used by app/convert/[pair] until its P6 template rebuild.
        ink: token("--legacy-ink"),
        paper: token("--legacy-paper"),
        mist: token("--legacy-mist"),
        acid: token("--legacy-acid"),
        iris: token("--legacy-iris"),
        line: token("--legacy-line"),
        panel: token("--legacy-panel"),
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        // LEGACY — pair pages only, until P6.
        display: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
