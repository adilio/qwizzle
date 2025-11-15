/**
 * Validation functions for Qwizzle plugins
 */

import type { WordItem, ThemeManifest, QwizzleConfig } from "@qwizzle/plugins";

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  stats?: Record<string, string | number>;
}

export async function validateWordList(content: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats: Record<string, string | number> = {};

  try {
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      errors.push("Word list must be an array");
      return { valid: false, errors };
    }

    stats["Total words"] = data.length;

    if (data.length === 0) {
      errors.push("Word list cannot be empty");
      return { valid: false, errors };
    }

    const words = new Set<string>();
    let withDefinition = 0;
    let withExpansion = 0;
    let withClue = 0;

    data.forEach((item: unknown, index: number) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`Item at index ${index} is not an object`);
        return;
      }

      const wordItem = item as Partial<WordItem>;

      if (!wordItem.word || typeof wordItem.word !== "string") {
        errors.push(`Item at index ${index} is missing or has invalid 'word' field`);
        return;
      }

      const word = wordItem.word.toUpperCase();
      if (words.has(word)) {
        errors.push(`Duplicate word found: "${word}" at index ${index}`);
      }
      words.add(word);

      if (!wordItem.definition && !wordItem.clue && !wordItem.expansion) {
        warnings.push(`Word "${word}" has no definition, clue, or expansion`);
      }

      if (wordItem.definition) withDefinition++;
      if (wordItem.expansion) withExpansion++;
      if (wordItem.clue) withClue++;

      // Check word length
      if (word.length < 2) {
        warnings.push(`Word "${word}" is very short (< 2 characters)`);
      }
      if (word.length > 20) {
        warnings.push(`Word "${word}" is very long (> 20 characters)`);
      }

      // Check for non-alphabetic characters
      if (!/^[A-Z]+$/.test(word)) {
        warnings.push(`Word "${word}" contains non-alphabetic characters`);
      }
    });

    stats["Unique words"] = words.size;
    stats["With definition"] = withDefinition;
    stats["With expansion"] = withExpansion;
    stats["With clue"] = withClue;
    stats["Avg word length"] = Math.round(Array.from(words).reduce((sum, word) => sum + word.length, 0) / words.size);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export async function validateTheme(content: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats: Record<string, string | number> = {};

  try {
    const data = JSON.parse(content);

    if (typeof data !== "object" || data === null) {
      errors.push("Theme must be an object");
      return { valid: false, errors };
    }

    const theme = data as Partial<ThemeManifest>;

    // Required fields
    if (!theme.id || typeof theme.id !== "string") {
      errors.push("Theme must have an 'id' field");
    }
    if (!theme.name || typeof theme.name !== "string") {
      errors.push("Theme must have a 'name' field");
    }
    if (!theme.colors || typeof theme.colors !== "object") {
      errors.push("Theme must have a 'colors' object");
    }

    if (theme.colors) {
      const requiredColors = ["bg", "fg", "accent", "muted", "tCorrect", "tPresent", "tAbsent"];
      const missingColors = requiredColors.filter((color) => !(color in theme.colors!));

      if (missingColors.length > 0) {
        errors.push(`Missing required colors: ${missingColors.join(", ")}`);
      }

      // Validate color format
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (typeof value !== "string") {
          errors.push(`Color '${key}' must be a string`);
        } else if (!/^#[0-9A-Fa-f]{3,8}$/.test(value) && !value.startsWith("rgba")) {
          warnings.push(`Color '${key}' (${value}) may not be a valid CSS color`);
        }
      });

      stats["Total colors"] = Object.keys(theme.colors).length;
    }

    if (theme.lightColors) {
      stats["Has light variant"] = "Yes";
    }

    if (theme.typography) {
      stats["Custom typography"] = "Yes";
    }

    if (theme.sizing) {
      stats["Custom sizing"] = "Yes";
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export async function validateConfig(content: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats: Record<string, string | number> = {};

  try {
    const data = JSON.parse(content);

    if (typeof data !== "object" || data === null) {
      errors.push("Config must be an object");
      return { valid: false, errors };
    }

    const config = data as Partial<QwizzleConfig>;

    if (config.wordLists) {
      if (!Array.isArray(config.wordLists)) {
        errors.push("wordLists must be an array");
      } else {
        stats["Word list providers"] = config.wordLists.length;

        config.wordLists.forEach((provider, index) => {
          if (!provider.type) {
            errors.push(`Word list at index ${index} missing 'type'`);
          }
          if (!provider.category) {
            errors.push(`Word list at index ${index} missing 'category'`);
          }

          if (provider.type === "gist" && !("gistId" in provider)) {
            errors.push(`Gist provider at index ${index} missing 'gistId'`);
          }
          if (provider.type === "url" && !("url" in provider)) {
            errors.push(`URL provider at index ${index} missing 'url'`);
          }
          if (provider.type === "local" && !("data" in provider)) {
            errors.push(`Local provider at index ${index} missing 'data'`);
          }
        });
      }
    }

    if (config.themes) {
      if (!Array.isArray(config.themes)) {
        errors.push("themes must be an array");
      } else {
        stats["Custom themes"] = config.themes.length;
      }
    }

    if (config.theme && typeof config.theme !== "string") {
      errors.push("theme must be a string (theme ID)");
    }

    if (config.categories) {
      if (!Array.isArray(config.categories)) {
        errors.push("categories must be an array");
      } else {
        stats["Categories"] = config.categories.length;
      }
    }

    if (!config.wordLists && !config.themes && !config.theme) {
      warnings.push("Config has no word lists, themes, or active theme configured");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      stats,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
