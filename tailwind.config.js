import animate from 'tailwindcss-animate'

const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Larguras de avaliação: 390 / 768 / 1440
    screens: {
      xs: '390px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          foreground: token('primary-foreground'),
        },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        card: {
          DEFAULT: token('card'),
          foreground: token('card-foreground'),
          elevated: token('card-elevated'),
        },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        band: token('band'),         // faixa marrom do rodapé ("KURIO / Feito para colecionadores")
        required: token('required'), // asterisco de campo obrigatório
        success: token('success'),
        warning: token('warning'),
      },
      fontFamily: {
        // A UI inteira é monoespaçada no Figma
        sans: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        micro: ['0.625rem', { lineHeight: '0.875rem' }],                      // 10px: rodapé, badges
        body: ['0.8125rem', { lineHeight: '1.25rem' }],                       // 13px: texto corrido
        title: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '700' }],     // títulos de seção/card
        heading: ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],       // nome do NFT, "Perfil do colecionador"
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }], // hero "SEJA DONO DO FUTURO"
      },
      borderRadius: {
        sm: '0.25rem',   // 4px: inputs
        md: '0.375rem',  // 6px: botões
        lg: '0.75rem',   // 12px: cards e miniaturas
        xl: '1.25rem',   // 20px: hero e modais
        '2xl': '2rem',   // 32px: containers mobile (bottom sheet, tab bar)
      },
      maxWidth: {
        content: '75rem', // 1200px: largura útil do desktop
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, hsl(28 55% 47%), hsl(30 65% 62%))', // CTAs mobile
        'hero-gradient': 'linear-gradient(135deg, hsl(22 38% 24%), hsl(15 30% 11%))',    // hero mobile
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
}
