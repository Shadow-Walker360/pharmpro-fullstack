// ════════════════════════════════════════════════════════════
// apps/web/tailwind.config.ts
// ════════════════════════════════════════════════════════════
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0d1117',
        bg2:     '#111827',
        bg3:     '#1a2235',
        bg4:     '#1e2a40',
        surface: 'rgba(255,255,255,0.04)',
        border:  'rgba(255,255,255,0.09)',
        text:    '#f0f4ff',
        text2:   '#8b9ab8',
        text3:   '#4a5878',
        blue: {
          DEFAULT: '#3b82f6',
          lt:      'rgba(59,130,246,0.18)',
          dk:      '#1e40af',
        },
        green: {
          DEFAULT: '#22c55e',
          lt:      'rgba(34,197,94,0.18)',
        },
        amber: {
          DEFAULT: '#f59e0b',
          lt:      'rgba(245,158,11,0.18)',
        },
        red: {
          DEFAULT: '#ef4444',
          lt:      'rgba(239,68,68,0.18)',
        },
        purple: {
          DEFAULT: '#a855f7',
          lt:      'rgba(168,85,247,0.18)',
        },
        teal: {
          DEFAULT: '#14b8a6',
          lt:      'rgba(20,184,166,0.18)',
        },
      },
      borderRadius: {
        sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px', '3xl': '24px',
      },
      backdropBlur: { glass: '18px' },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.2)',
        lg:    '0 8px 32px rgba(0,0,0,0.3)',
        xl:    '0 16px 48px rgba(0,0,0,0.4)',
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config


