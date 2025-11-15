#!/usr/bin/env node

import { Command } from "commander";
import { validateWordList, validateTheme, validateConfig } from "./validate.js";
import chalk from "chalk";

const program = new Command();

program
  .name("qwizzle")
  .description("CLI tools for Qwizzle plugin development")
  .version("1.0.0");

program
  .command("validate")
  .description("Validate a word list, theme, or config file")
  .argument("<file>", "Path to the file to validate")
  .option("-t, --type <type>", "File type: wordlist, theme, or config", "auto")
  .action(async (file: string, options: { type: string }) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      const content = await fs.readFile(file, "utf-8");
      const ext = path.extname(file);

      let type = options.type;
      if (type === "auto") {
        if (file.includes("wordlist") || file.includes("words")) {
          type = "wordlist";
        } else if (file.includes("theme")) {
          type = "theme";
        } else if (file.includes("config")) {
          type = "config";
        } else {
          console.error(chalk.red("❌ Could not auto-detect file type. Please specify with --type"));
          process.exit(1);
        }
      }

      console.log(chalk.blue(`\n📋 Validating ${type}...\n`));

      let result;
      switch (type) {
        case "wordlist":
          result = await validateWordList(content);
          break;
        case "theme":
          result = await validateTheme(content);
          break;
        case "config":
          result = await validateConfig(content);
          break;
        default:
          console.error(chalk.red(`❌ Unknown type: ${type}`));
          process.exit(1);
      }

      if (result.valid) {
        console.log(chalk.green("✅ Validation passed!"));
        if (result.warnings && result.warnings.length > 0) {
          console.log(chalk.yellow("\n⚠️  Warnings:"));
          result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`   - ${warning}`));
          });
        }
        if (result.stats) {
          console.log(chalk.blue("\n📊 Stats:"));
          Object.entries(result.stats).forEach(([key, value]) => {
            console.log(chalk.blue(`   ${key}: ${value}`));
          });
        }
      } else {
        console.log(chalk.red("❌ Validation failed!"));
        if (result.errors && result.errors.length > 0) {
          console.log(chalk.red("\n❌ Errors:"));
          result.errors.forEach((error) => {
            console.log(chalk.red(`   - ${error}`));
          });
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("\n❌ Error reading file:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("create")
  .description("Create a new plugin from a template")
  .argument("<type>", "Plugin type: wordlist, theme, or config")
  .argument("[name]", "Plugin name")
  .action(async (type: string, name?: string) => {
    console.log(chalk.blue(`\n🚀 Creating new ${type} plugin...\n`));

    const templates = {
      wordlist: `[
  {
    "word": "EXAMPLE",
    "expansion": "Example Acronym",
    "definition": "An example word for demonstration purposes",
    "clue": "Sample hint"
  }
]`,
      theme: `{
  "id": "${name || "my-theme"}",
  "name": "${name || "My Theme"}",
  "description": "A custom theme",
  "version": "1.0.0",
  "colors": {
    "bg": "#000000",
    "fg": "#ffffff",
    "muted": "#666666",
    "accent": "#00cc66",
    "success": "#00cc66",
    "danger": "#ff0000",
    "surface": "#111111",
    "surfaceBorder": "#333333",
    "tBase": "#111111",
    "tBorder": "#333333",
    "tCorrect": "#00cc66",
    "tPresent": "#ffcc00",
    "tAbsent": "#222222",
    "keyBorder": "#333333"
  }
}`,
      config: `{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "your-gist-id-here",
      "category": "custom"
    }
  ],
  "themes": [],
  "theme": "qwizzle-dark"
}`,
    };

    const template = templates[type as keyof typeof templates];
    if (!template) {
      console.error(chalk.red(`❌ Unknown type: ${type}`));
      console.log(chalk.blue("   Valid types: wordlist, theme, config"));
      process.exit(1);
    }

    const filename = `${name || type}.${type === "config" ? "qwizzle.config.json" : "json"}`;

    try {
      const fs = await import("fs/promises");
      await fs.writeFile(filename, template, "utf-8");
      console.log(chalk.green(`✅ Created ${filename}`));
      console.log(chalk.blue(`\n💡 Edit the file and run: qwizzle validate ${filename}\n`));
    } catch (error) {
      console.error(chalk.red("❌ Error creating file:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export function run() {
  program.parse();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
