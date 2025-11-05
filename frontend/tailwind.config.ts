import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        indexflow: {
          primary: "#6E56CF",
          secondary: "#12B886",
          accent: "#FFB224",
          bg: "#0B0D12",
          text: "#E6EAF2"
        }
      },
      boxShadow: {
        glass: "0 20px 45px -20px rgba(111, 86, 207, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
