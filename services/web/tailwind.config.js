/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Immich-inspired dark theme
        immich: {
          'bg': '#000000',           // Pure black background
          'sidebar': '#0f0f0f',      // Sidebar background
          'card': '#1a1a1a',         // Card backgrounds
          'hover': '#2a2a2a',        // Hover states
          'input': '#374151',        // Input backgrounds
          'border': '#262626',       // Borders
          'text': '#ffffff',         // Primary text
          'text-secondary': '#d1d5db', // Secondary text
          'text-muted': '#9ca3af',   // Muted text
          'accent': '#3b82f6',       // Blue accent
          'success': '#10b981',      // Green success
          'warning': '#eab308',      // Yellow warning
          'error': '#ef4444',        // Red error
        },
      },
    },
  },
  plugins: [],
}
