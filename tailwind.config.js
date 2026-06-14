/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-fg": "var(--color-primary-fg)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        foreground: "var(--color-foreground)",
        "muted-fg": "var(--color-muted-fg)",
        border: "var(--color-border)",

        brand: {
          purple: "#7B2FBE",
          red: "var(--color-brand-red)",
          amber: "var(--color-brand-amber)",
          brown: "var(--color-brand-brown)",
          black: "#09090B",
        },
      },
      fontFamily: {
        sans: ["Geist-Regular"],
        "sans-semibold": ["Geist-SemiBold"],
        logo: ["Debby"],
      },
    },
  },
  plugins: [],
};
