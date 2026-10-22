/** Tailwind 3.4 + HeroUI 2.7 theme. Preflight is off so the existing globals.css keeps its base styles;
 *  a minimal border reset in app/tailwind.css gives HeroUI the border defaults it expects. */
const { heroui } = require("@heroui/react");
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"],
  corePlugins: { preflight: false },
  theme: { extend: { fontFamily: { sans: ["var(--font-rubik)", "ui-sans-serif", "system-ui", "sans-serif"] } } },
  darkMode: "class",
  plugins: [heroui({
    defaultTheme: "light",
    layout: {
      radius: { small: "8px", medium: "12px", large: "18px" },
      borderWidth: { small: "1px", medium: "1px", large: "2px" },
      boxShadow: {
        small: "0 1px 2px rgba(0,0,0,.04), 0 2px 6px -2px rgba(0,0,0,.06)",
        medium: "0 1px 2px rgba(0,0,0,.04), 0 8px 24px -8px rgba(0,0,0,.10)",
        large: "0 2px 4px rgba(0,0,0,.04), 0 24px 48px -18px rgba(0,0,0,.18)",
      },
      disabledOpacity: "0.5",
    },
    themes: { light: { colors: {
      background: "#fafafa", foreground: "#1a1a1a", divider: "#ebebeb", focus: "#1a1a1a", overlay: "#000000",
      content1: "#ffffff", content2: "#f5f5f5", content3: "#efefef", content4: "#e0e0e0",
      default: { 50: "#fafafa", 100: "#f5f5f5", 200: "#ebebeb", 300: "#e0e0e0", 400: "#bdbdbd", 500: "#8a8a8a", 600: "#666666", 700: "#4a4a4a", 800: "#333333", 900: "#1a1a1a", DEFAULT: "#ebebeb", foreground: "#1a1a1a" },
      primary: { 50: "#f5f5f5", 100: "#e8e8e8", 200: "#cfcfcf", 300: "#a8a8a8", 400: "#6b6b6b", 500: "#333333", 600: "#1a1a1a", 700: "#141414", 800: "#0f0f0f", 900: "#0a0a0a", DEFAULT: "#1a1a1a", foreground: "#ffffff" },
      secondary: { 50: "#fbfef0", 100: "#eefcc9", 200: "#e2f99d", 300: "#d6f76e", 400: "#c6f432", 500: "#a9d61c", 600: "#86ab12", 700: "#3d5400", 800: "#2e4000", 900: "#1f2b00", DEFAULT: "#c6f432", foreground: "#1a1a1a" },
      success: { DEFAULT: "#2f6b00", foreground: "#ffffff", 50: "#f3fbe8", 100: "#e6f9c8", 600: "#2f6b00" },
      warning: { DEFAULT: "#8a5a00", foreground: "#ffffff", 50: "#fff8e6", 100: "#fff2d1", 600: "#8a5a00" },
      danger: { DEFAULT: "#b42318", foreground: "#ffffff", 50: "#fff1ef", 100: "#ffe4e1", 600: "#b42318" },
    } } },
  })],
};
