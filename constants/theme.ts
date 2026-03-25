export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  border: '#333355',

  neonGreen: '#39FF14',
  electricBlue: '#00D4FF',
  hotPink: '#FF1060',
  neonYellow: '#FFE600',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#666680',

  correct: '#39FF14',
  incorrect: '#FF1060',
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 22, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  mono: { fontSize: 18, fontWeight: '600' as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
