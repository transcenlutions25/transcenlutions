import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060a",
          900: "#0a0c14",
          800: "#11141d",
          700: "#1a1f2c",
          600: "#262c3d",
        },
        gold: {
          DEFAULT: "#D4AF37",
          soft: "#E8C75A",
          dim: "rgba(212,175,55,0.18)",
        },
        accent: {
          green: "#22C55E",
          violet: "#A78BFA",
          blue: "#60A5FA",
          rose: "#F87171",
          amber: "#EAB308",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px rgba(212,175,55,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
