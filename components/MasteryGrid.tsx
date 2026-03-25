import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { CHROMATIC_NOTES, STANDARD_TUNING } from '../constants/fretboard';
import { useMasteryStore } from '../stores/masteryStore';
import type { GuitarString, MasteryLevel, Note } from '../types';

const STRING_LABELS: Record<GuitarString, string> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  new: '#FF1060',
  learning: '#FF8C00',
  familiar: '#FFE600',
  mastered: '#39FF14',
};

const MASTERY_BG: Record<MasteryLevel, string> = {
  new: 'rgba(255, 16, 96, 0.12)',
  learning: 'rgba(255, 140, 0, 0.12)',
  familiar: 'rgba(255, 230, 0, 0.10)',
  mastered: 'rgba(57, 255, 20, 0.12)',
};

function getNoteForStringAndIndex(guitarString: GuitarString, noteIndex: number): { note: Note; fret: number } {
  const openNote = STANDARD_TUNING[guitarString];
  const openIdx = CHROMATIC_NOTES.indexOf(openNote);
  // Find the fret where this note appears (within 0-11)
  const fret = (noteIndex - openIdx + 12) % 12;
  return { note: CHROMATIC_NOTES[noteIndex], fret };
}

export default function MasteryGrid() {
  const combos = useMasteryStore((s) => s.combos);

  return (
    <View style={styles.container}>
      {/* Column headers — note names */}
      <View style={styles.headerRow}>
        <View style={styles.stringLabel} />
        {CHROMATIC_NOTES.map((note) => (
          <View key={note} style={styles.headerCell}>
            <Text style={styles.headerText}>{note}</Text>
          </View>
        ))}
      </View>

      {/* Rows — one per string (6 down to 1) */}
      {([6, 5, 4, 3, 2, 1] as GuitarString[]).map((guitarString) => (
        <View key={guitarString} style={styles.row}>
          <View style={styles.stringLabel}>
            <Text style={styles.stringLabelText}>{STRING_LABELS[guitarString]}</Text>
          </View>
          {CHROMATIC_NOTES.map((_, noteIndex) => {
            const { note, fret } = getNoteForStringAndIndex(guitarString, noteIndex);
            const key = `${guitarString}-${fret}`;
            const mastery = combos[key];
            const level = mastery?.level ?? 'new';
            const total = mastery ? mastery.correctCount + mastery.incorrectCount : 0;
            const accent = MASTERY_COLORS[level];
            const bg = MASTERY_BG[level];

            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  { backgroundColor: bg, borderColor: accent },
                  level === 'mastered' && styles.cellMastered,
                ]}
              >
                <Text style={[styles.cellNote, { color: accent }]}>{note}</Text>
                {total > 0 && (
                  <Text style={[styles.cellCount, { color: accent }]}>{total}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        {(['new', 'learning', 'familiar', 'mastered'] as MasteryLevel[]).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MASTERY_COLORS[level] }]} />
            <Text style={styles.legendText}>{level}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL_SIZE = 26;

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  headerCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  stringLabel: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stringLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.electricBlue,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellMastered: {
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  cellNote: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cellCount: {
    fontSize: 6,
    fontWeight: '500',
    opacity: 0.6,
    marginTop: -1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
