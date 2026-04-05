/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Order status colors
        'status-queued': '#FFA940',     // Yellow - 排队中
        'status-cooking': '#40A9FF',    // Blue - 制作中
        'status-ready': '#52C41A',      // Green - 即将上桌
        'status-served': '#8C8C8C',     // Gray - 已上桌
        'status-urge': '#FF4D4F',       // Red - 催单
      },
      animation: {
        'pulse-red': 'pulse-red 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { borderColor: '#FF4D4F', boxShadow: '0 0 0 0 rgba(255, 77, 79, 0.7)' },
          '50%': { borderColor: '#FF7875', boxShadow: '0 0 0 8px rgba(255, 77, 79, 0)' },
        },
      },
    },
  },
  plugins: [],
}
