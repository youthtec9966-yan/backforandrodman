import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        line: "#d7ded8",
        mist: "#f5f7f5",
        moss: "#286c53",
        leaf: "#4f8b6d",
        coral: "#c75d4b",
        amber: "#b7791f",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 32, 27, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
