import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pop-in': { '0%': { transform: 'scale(0)' }, '70%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
        'win-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.6)' },
          '50%': { boxShadow: '0 0 22px 6px hsl(var(--primary) / 0.55)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        'win-glow': 'win-glow 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
