/**
 * Tile Component for Mobile
 */

import { View, Text, StyleSheet } from "react-native";
import type { LetterFeedback } from "@qwizzle/engine";
import { useTheme } from "../theme/ThemeContext";

interface TileProps {
  letter?: string;
  feedback?: LetterFeedback;
  isInvalid?: boolean;
}

export function Tile({ letter, feedback, isInvalid }: TileProps) {
  const { colors } = useTheme();

  const getBgColor = () => {
    if (feedback) {
      switch (feedback.mark) {
        case "correct":
          return colors.tCorrect;
        case "present":
          return colors.tPresent;
        case "absent":
          return colors.tAbsent;
      }
    }
    return colors.tBase;
  };

  const borderColor = isInvalid ? colors.danger : colors.tBorder;

  return (
    <View style={[styles.tile, { backgroundColor: getBgColor(), borderColor }]}>
      <Text style={[styles.letter, { color: colors.fg }]}>{letter || ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    margin: 3,
  },
  letter: {
    fontSize: 32,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
