import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', 'system-ui', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', 'ui-monospace', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        brand: {
          50: "#FEF2F2",
          100: "#FDE3E4",
          200: "#FAC8CA",
          300: "#F4A1A4",
          400: "#EA7075",
          500: "#DB464C",
          600: "#DB464C",
          700: "#94161B",
          800: "#811418",
          900: "#5E0F12",
          950: "#3A090B",
        },
        navbar_color: "#94161B",
        header_color: "#004449",
        deep_red: "#811418",
        offWhite: "#FDFAEC",
        faint: "#85793E",
        milk: "#D9D9D9",
        diamond: "#A7C6ED",
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgba(15,23,42,0.04)",
        "elev-2": "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        "elev-3": "0 8px 30px rgba(15,23,42,0.035)",
        "elev-4": "0 18px 50px rgba(15,23,42,0.16)",
        "elev-5": "0 28px 80px rgba(15,23,42,0.28)",
        auth: "0 12px 30px rgba(15,23,42,0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-left": { from: { transform: "translateX(-105%)" }, to: { transform: "translateX(0)" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-up": "fade-up 280ms cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 200ms ease-out both",
        "slide-in-left": "slide-in-left 240ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
