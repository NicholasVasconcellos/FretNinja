import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../constants/theme';
import { useSettingsStore } from '../../stores/settingsStore';
import type { StringLabelStyle } from '../../types';

/* ── option arrays ─────────────────────────────────────── */

const ROUND_OPTIONS = [5, 10, 15, 20];
const TIMER_VALUES = [0, 5, 10, 15, 30];
const STRING_LABEL_OPTIONS: StringLabelStyle[] = ['number', 'name'];

const timerLabel = (v: number) => (v === 0 ? 'Off' : `${v}s`);
const stringLabel = (v: StringLabelStyle) =>
  v === 'number' ? '1  2  3  4  5  6' : 'E  B  G  D  A  E';

/* ── reusable sub-components ───────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sh.row}>
      <Text style={sh.text}>{title}</Text>
      <View style={sh.line} />
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: colors.neonGreen,
    marginRight: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neonGreen + '44',
  },
});

/* ── segmented control ─────────────────────────────────── */

function SegmentedControl<T extends string | number>({
  options,
  selected,
  onSelect,
  label,
}: {
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  label?: (v: T) => string;
}) {
  return (
    <View style={seg.track}>
      {options.map((opt, i) => {
        const active = opt === selected;
        return (
          <TouchableOpacity
            key={String(opt)}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            style={[
              seg.option,
              active && seg.optionActive,
              i === 0 && seg.first,
              i === options.length - 1 && seg.last,
            ]}
          >
            <Text style={[seg.label, active && seg.labelActive]}>
              {label ? label(opt) : String(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.neonGreen,
    ...Platform.select({
      ios: {
        shadowColor: colors.neonGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  first: { borderTopLeftRadius: borderRadius.sm - 1, borderBottomLeftRadius: borderRadius.sm - 1 },
  last: { borderTopRightRadius: borderRadius.sm - 1, borderBottomRightRadius: borderRadius.sm - 1, borderRightWidth: 0 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.background,
    fontWeight: '700',
  },
});

/* ── fret stepper ──────────────────────────────────────── */

function FretStepper({
  value,
  min,
  max,
  onChange,
  tag,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  tag: string;
}) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <View style={fs.wrapper}>
      <Text style={fs.tag}>{tag}</Text>
      <View style={fs.row}>
        <TouchableOpacity
          style={[fs.btn, atMin && fs.btnOff]}
          onPress={() => !atMin && onChange(value - 1)}
          activeOpacity={0.6}
          disabled={atMin}
        >
          <Text style={[fs.btnTxt, atMin && fs.btnTxtOff]}>−</Text>
        </TouchableOpacity>
        <View style={fs.valBox}>
          <Text style={fs.val}>{value}</Text>
        </View>
        <TouchableOpacity
          style={[fs.btn, atMax && fs.btnOff]}
          onPress={() => !atMax && onChange(value + 1)}
          activeOpacity={0.6}
          disabled={atMax}
        >
          <Text style={[fs.btnTxt, atMax && fs.btnTxtOff]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fs = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOff: { opacity: 0.3 },
  btnTxt: { fontSize: 20, fontWeight: '600', color: colors.neonGreen },
  btnTxtOff: { color: colors.textMuted },
  valBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

/* ── card wrapper ──────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return <View style={card.box}>{children}</View>;
}

const card = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});

/* ── toggle row (label + switch on same line) ──────────── */

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Card>
      <View style={tr.row}>
        <View style={tr.info}>
          <Text style={tr.label}>{label}</Text>
          <Text style={tr.hint}>{hint}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.surfaceLight, true: colors.neonGreen + '55' }}
          thumbColor={value ? colors.neonGreen : colors.textMuted}
          ios_backgroundColor={colors.surfaceLight}
        />
      </View>
    </Card>
  );
}

const tr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginRight: spacing.md },
  label: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

/* ══════════════════════════════════════════════════════════
   SETTINGS SCREEN
   ══════════════════════════════════════════════════════════ */

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    questionsPerRound,
    minFret,
    maxFret,
    timerEnabled,
    timerDurationSec,
    smartWeighting,
    showFretboardAfterAnswer,
    stringLabelStyle,
    updateSettings,
    resetSettings,
  } = useSettingsStore();

  /* derived timer value for segmented control */
  const timerValue = timerEnabled ? timerDurationSec : 0;

  const setTimer = useCallback(
    (v: number) => {
      if (v === 0) updateSettings({ timerEnabled: false });
      else updateSettings({ timerEnabled: true, timerDurationSec: v });
    },
    [updateSettings],
  );

  const setMinFret = useCallback(
    (v: number) => {
      if (v <= maxFret) updateSettings({ minFret: v });
    },
    [maxFret, updateSettings],
  );

  const setMaxFret = useCallback(
    (v: number) => {
      if (v >= minFret) updateSettings({ maxFret: v });
    },
    [minFret, updateSettings],
  );

  return (
    <View style={[s.safeTop, { paddingTop: insets.top }]}>
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Quiz ──────────────────────────────────── */}
      <SectionHeader title="QUIZ" />

      <Card>
        <Text style={s.cardLabel}>Round Length</Text>
        <Text style={s.cardHint}>Questions per round</Text>
        <View style={s.controlWrap}>
          <SegmentedControl
            options={ROUND_OPTIONS}
            selected={questionsPerRound}
            onSelect={(v) => updateSettings({ questionsPerRound: v })}
          />
        </View>
      </Card>

      <Card>
        <Text style={s.cardLabel}>Fret Range</Text>
        <Text style={s.cardHint}>
          Frets {minFret} – {maxFret}
        </Text>
        <View style={s.fretRow}>
          <FretStepper value={minFret} min={0} max={maxFret} onChange={setMinFret} tag="min" />
          <View style={s.fretDivider}>
            <View style={s.fretDot} />
            <View style={s.fretLine} />
            <View style={s.fretDot} />
          </View>
          <FretStepper value={maxFret} min={minFret} max={24} onChange={setMaxFret} tag="max" />
        </View>
      </Card>

      <Card>
        <Text style={s.cardLabel}>Timer</Text>
        <Text style={s.cardHint}>Time limit per question</Text>
        <View style={s.controlWrap}>
          <SegmentedControl
            options={TIMER_VALUES}
            selected={timerValue}
            onSelect={setTimer}
            label={timerLabel}
          />
        </View>
      </Card>

      {/* ── Display ───────────────────────────────── */}
      <SectionHeader title="DISPLAY" />

      <Card>
        <Text style={s.cardLabel}>String Labels</Text>
        <Text style={s.cardHint}>How strings appear in the UI</Text>
        <View style={s.controlWrap}>
          <SegmentedControl
            options={STRING_LABEL_OPTIONS}
            selected={stringLabelStyle}
            onSelect={(v) => updateSettings({ stringLabelStyle: v })}
            label={stringLabel}
          />
        </View>
      </Card>

      <ToggleRow
        label="Show Fretboard"
        hint="Display diagram after each answer"
        value={showFretboardAfterAnswer}
        onValueChange={(v) => updateSettings({ showFretboardAfterAnswer: v })}
      />

      {/* ── Advanced ──────────────────────────────── */}
      <SectionHeader title="ADVANCED" />

      <ToggleRow
        label="Smart Weighting"
        hint="Prioritizes notes you struggle with — missed notes appear more often while mastered ones fade back, so every round targets your weakest spots."
        value={smartWeighting}
        onValueChange={(v) => updateSettings({ smartWeighting: v })}
      />

      {/* ── Reset ─────────────────────────────────── */}
      <TouchableOpacity style={s.resetBtn} onPress={resetSettings} activeOpacity={0.7}>
        <Text style={s.resetTxt}>Reset to Defaults</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

/* ── screen styles ─────────────────────────────────────── */

const s = StyleSheet.create({
  safeTop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  cardLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  controlWrap: {
    marginTop: spacing.sm + 2,
  },

  /* fret range */
  fretRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  fretDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 3,
  },
  fretDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neonGreen + '66',
  },
  fretLine: {
    width: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neonGreen + '44',
  },

  /* reset */
  resetBtn: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.hotPink + '88',
  },
  resetTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.hotPink,
  },
});
