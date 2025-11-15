/**
 * Keyboard Component for Mobile
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { LetterMark } from "@qwizzle/engine";
import { useTheme } from "../theme/ThemeContext";

interface KeyboardProps {
  onChar: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  keyState: Record<string, LetterMark | undefined>;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

export function Keyboard({ onChar, onBackspace, onEnter, keyState, disabled }: KeyboardProps) {
  const { colors } = useTheme();

  const getKeyColor = (key: string) => {
    const state = keyState[key];
    if (!state) {
      return colors.tBase;
    }
    switch (state) {
      case "correct":
        return colors.tCorrect;
      case "present":
        return colors.tPresent;
      case "absent":
        return colors.tAbsent;
      default:
        return colors.tBase;
    }
  };

  const handleKeyPress = (key: string) => {
    if (disabled) {
      return;
    }

    if (key === "ENTER") {
      onEnter();
    } else if (key === "⌫") {
      onBackspace();
    } else {
      onChar(key);
    }
  };

  return (
    <View style={styles.keyboard}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => {
            const isWide = key === "ENTER" || key === "⌫";
            const bgColor = getKeyColor(key);

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  isWide && styles.wideKey,
                  { backgroundColor: bgColor, borderColor: colors.keyBorder },
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: colors.fg }, isWide && styles.smallText]}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 3,
  },
  key: {
    minWidth: 32,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
    paddingHorizontal: 8,
  },
  wideKey: {
    minWidth: 60,
  },
  keyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  smallText: {
    fontSize: 12,
  },
});
