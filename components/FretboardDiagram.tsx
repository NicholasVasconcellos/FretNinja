import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { getNoteAtFret, TOTAL_STRINGS } from '../constants/fretboard';
import type { GuitarString, Note } from '../types';

interface FretboardDiagramProps {
  /** The string to highlight on */
  highlightString: GuitarString;
  /** The note to highlight */
  highlightNote: Note;
  /** Start of fret range to display */
  minFret?: number;
  /** End of fret range to display */
  maxFret?: number;
}

/** Short string labels (low E at top, high E at bottom) */
const STRING_LABELS: Record<GuitarString, string> = {
  6: 'E',
  5: 'A',
  4: 'D',
  3: 'G',
  2: 'B',
  1: 'e',
};

/** Strings ordered top-to-bottom (6 = low E at top) */
const STRINGS_TOP_DOWN: GuitarString[] = [6, 5, 4, 3, 2, 1];

export function FretboardDiagram({
  highlightString,
  highlightNote,
  minFret = 0,
  maxFret = 12,
}: FretboardDiagramProps) {
  const fretCount = maxFret - minFret;
  // Find which frets on the highlight string produce the target note
  const highlightFrets: number[] = [];
  for (let f = minFret; f <= maxFret; f++) {
    if (getNoteAtFret(highlightString, f) === highlightNote) {
      highlightFrets.push(f);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.fretboard}>
        {/* String labels on the left */}
        <View style={styles.labelColumn}>
          {STRINGS_TOP_DOWN.map((s) => (
            <View key={s} style={styles.labelCell}>
              <Text
                style={[
                  styles.stringLabel,
                  s === highlightString && styles.stringLabelActive,
                ]}
              >
                {STRING_LABELS[s]}
              </Text>
            </View>
          ))}
        </View>

        {/* Fret grid */}
        <View style={styles.grid}>
          {/* Fret number headers */}
          <View style={styles.fretNumberRow}>
            {Array.from({ length: fretCount + 1 }, (_, i) => {
              const fret = minFret + i;
              return (
                <View key={fret} style={styles.fretNumberCell}>
                  <Text style={styles.fretNumber}>{fret}</Text>
                </View>
              );
            })}
          </View>

          {/* String rows */}
          {STRINGS_TOP_DOWN.map((s) => (
            <View key={s} style={styles.stringRow}>
              {Array.from({ length: fretCount + 1 }, (_, i) => {
                const fret = minFret + i;
                const isHighlight =
                  s === highlightString && highlightFrets.includes(fret);
                const isNut = fret === 0;
                return (
                  <View key={fret} style={styles.fretCell}>
                    {/* Fret wire (left edge of cell) */}
                    {i > 0 && (
                      <View
                        style={[styles.fretWire, isNut && styles.nutWire]}
                      />
                    )}
                    {/* String line */}
                    <View style={styles.stringLine} />
                    {/* Highlight dot */}
                    {isHighlight && (
                      <View style={styles.highlightDot}>
                        <Text style={styles.highlightText}>
                          {highlightNote}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const DOT_SIZE = 26;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fretboard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    overflow: 'hidden',
  },
  labelColumn: {
    width: 24,
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  labelCell: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stringLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stringLabelActive: {
    color: colors.neonGreen,
  },
  grid: {
    flex: 1,
  },
  fretNumberRow: {
    flexDirection: 'row',
    height: 16,
  },
  fretNumberCell: {
    flex: 1,
    alignItems: 'center',
  },
  fretNumber: {
    fontSize: 9,
    color: colors.textMuted,
  },
  stringRow: {
    flexDirection: 'row',
    height: 22,
    alignItems: 'center',
  },
  fretCell: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fretWire: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  nutWire: {
    width: 3,
    backgroundColor: colors.textSecondary,
  },
  stringLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.textMuted,
  },
  highlightDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.neonGreen,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
});
