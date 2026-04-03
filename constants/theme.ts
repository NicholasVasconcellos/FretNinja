import { StyleSheet } from 'react-native';

// ── Colors ──────────────────────────────────────────────────
export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#252540',
  border: '#333355',

  neonGreen: '#39FF14',
  electricBlue: '#00D4FF',
  hotPink: '#FF1060',
  neonYellow: '#FFE600',
  amber: '#FF8C00',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#666680',

  correct: '#39FF14',
  incorrect: '#FF1060',
} as const;

/** Append hex alpha to a color: `alpha('#FF0000', 0.5)` → `'#FF000080'` */
export const alpha = (hex: string, opacity: number): string => {
  const a = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

// ── Typography ──────────────────────────────────────────────
export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 22, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  mono: { fontSize: 18, fontWeight: '600' as const },
} as const;

// ── Spacing ─────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ── Border radius ───────────────────────────────────────────
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ── Icon sizes ──────────────────────────────────────────────
export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

// ── Neon glow shadow presets (iOS shadow + Android elevation) ──
export const glow = {
  green: {
    shadowColor: colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  blue: {
    shadowColor: colors.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  pink: {
    shadowColor: colors.hotPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ══════════════════════════════════════════════════════════════
// Design System — shared component style presets.
// Compose with array syntax for inline overrides:
//   style={[ds.card, { marginTop: 20 }]}
// ══════════════════════════════════════════════════════════════

export const ds = StyleSheet.create({
  /* ── Screens ── */
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenCentered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  /* ── Cards ── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* ── Buttons ── */
  buttonPrimary: {
    backgroundColor: colors.neonGreen,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPrimaryPressed: {
    opacity: 0.85,
  },
  buttonPrimaryText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.background,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonOutlinePressed: {
    backgroundColor: colors.surface,
  },
  buttonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  buttonDanger: {
    borderWidth: 1,
    borderColor: alpha(colors.hotPink, 0.53),
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
  },
  buttonDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.hotPink,
  },

  /* ── Section headers ── */
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },

  /* ── Stat cards ── */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  /* ── Layout helpers ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: {
    gap: spacing.sm,
  },

  /* ── Lists ── */
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  /* ── Pills / Badges ── */
  pill: {
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  /* ── Divider ── */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
