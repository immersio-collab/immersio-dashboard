import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Sober B2B palette: neutral grays + single dark blue accent.
         * No flashy colors, no gradients. Backgrounds stay in the white to
         * light-gray range to keep the interface clean and readable.
         */
        background: "#ffffff",
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f9fafb",
          subtle: "#f3f4f6",
        },
        border: {
          DEFAULT: "#e5e7eb",
          strong: "#d1d5db",
        },
        accent: {
          DEFAULT: "#111827",
          hover: "#1f2937",
          foreground: "#ffffff",
        },
        text: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          subtle: "#9ca3af",
          inverse: "#ffffff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        /**
         * Slightly rounded corners only. Max 6px to stay in the
         * Linear / Notion / Stripe tool aesthetic.
         */
        DEFAULT: "4px",
        md: "5px",
        lg: "6px",
        xl: "6px",
        "2xl": "6px",
      },
      boxShadow: {
        /**
         * Subtle, functional shadows only. No "elevated card" effects.
         * Used sparingly, e.g. for dropdowns or popovers.
         */
        DEFAULT: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
      },
      borderWidth: {
        DEFAULT: "1px",
        0: "0",
        2: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
