/**
 * Board Component for Mobile
 */

import { View, StyleSheet } from "react-native";
import type { LetterFeedback } from "@qwizzle/engine";
import { Tile } from "./Tile";

interface BoardProps {
  rows: string[];
  feedbackRows: LetterFeedback[][];
  targetLength: number;
  invalidRow: number | null;
}

export function Board({ rows, feedbackRows, targetLength, invalidRow }: BoardProps) {
  return (
    <View style={styles.board}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: targetLength }).map((_, colIndex) => {
            const letter = row[colIndex];
            const feedback = feedbackRows[rowIndex]?.[colIndex];
            const isInvalid = invalidRow === rowIndex;

            return <Tile key={colIndex} letter={letter} feedback={feedback} isInvalid={isInvalid} />;
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignItems: "center",
    marginVertical: 20,
  },
  row: {
    flexDirection: "row",
    marginVertical: 2,
  },
});
