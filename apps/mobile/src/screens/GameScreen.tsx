/**
 * Game Screen for Mobile
 */

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../theme/ThemeContext";
import { useGameState } from "../hooks/useGameState";
import { Board } from "../components/Board";
import { Keyboard } from "../components/Keyboard";

export function GameScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { rows, cursor, feedbackRows, keyState, message, definition, expansion, invalidRow, targetLength, gameOver, stats, onChar, onBackspace, onEnter, reset } =
    useGameState();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.accent }]}>QWIZZLE</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
          <Text style={[styles.themeText, { color: colors.accent }]}>{isDark ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.fg }]}>{stats.played}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Played</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.fg }]}>{stats.wins}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Wins</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.fg }]}>{stats.streak}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.fg }]}>{stats.score}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Score</Text>
        </View>
      </View>

      {message ? (
        <View style={[styles.message, { backgroundColor: colors.surface }]}>
          <Text style={[styles.messageText, { color: colors.fg }]}>{message}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Board rows={rows} feedbackRows={feedbackRows} targetLength={targetLength} invalidRow={invalidRow} />

        {gameOver && (
          <View style={[styles.endGamePanel, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {expansion && (
              <Text style={[styles.expansion, { color: colors.accent }]}>
                {expansion}
              </Text>
            )}
            {definition && (
              <Text style={[styles.definition, { color: colors.fg }]}>
                {definition}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.accent }]}
              onPress={reset}
            >
              <Text style={[styles.resetButtonText, { color: colors.accentFg }]}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Keyboard
        onChar={onChar}
        onBackspace={onBackspace}
        onEnter={onEnter}
        keyState={keyState}
        disabled={gameOver}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  themeButton: {
    padding: 8,
  },
  themeText: {
    fontSize: 24,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  message: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  endGamePanel: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  expansion: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
