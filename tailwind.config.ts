import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "spektr-cyan-50": "#e0f7fa",
        border: "rgba(255,255,255,0.07)",
        input: "#141414",
        ring: "#2997ff",
        background: "#000000",
        foreground: "#f5f5f7",
        primary: {
          DEFAULT: "#2997ff",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#1f1f1f",
          foreground: "#f5f5f7",
        },
        destructive: {
          DEFAULT: "#ff453a",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#141414",
          foreground: "#a1a1a6",
        },
        accent: {
          DEFAULT: "#1f1f1f",
          foreground: "#f5f5f7",
        },
        popover: {
          DEFAULT: "#141414",
          foreground: "#f5f5f7",
        },
        card: {
          DEFAULT: "#141414",
          foreground: "#f5f5f7",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
