# Qwizzle Plugin Development Guide

This guide explains how to extend Qwizzle with custom word lists, themes, and more using the plugin system.

## Table of Contents

- [Overview](#overview)
- [Word List Plugins](#word-list-plugins)
- [Theme Plugins](#theme-plugins)
- [Configuration](#configuration)
- [Examples](#examples)

## Overview

Qwizzle supports a flexible plugin system that allows you to:

- **Load word lists from multiple sources**: GitHub Gists, URLs, local data
- **Create custom themes**: Define your own color schemes and styling
- **Combine multiple providers**: Mix and match different word sources
- **Configure everything via JSON**: Simple, declarative configuration

## Word List Plugins

### Supported Provider Types

#### 1. GitHub Gist Provider

Load word lists from public GitHub gists.

```json
{
  "type": "gist",
  "gistId": "your-gist-id-here",
  "filename": "words.json",
  "category": "custom"
}
```

**Gist Format:**
```json
[
  {
    "word": "API",
    "expansion": "Application Programming Interface",
    "definition": "A set of protocols and tools for building software applications."
  },
  {
    "word": "SDK",
    "expansion": "Software Development Kit",
    "definition": "A collection of software tools and libraries for developing applications."
  }
]
```

#### 2. URL Provider

Load word lists from any JSON endpoint.

```json
{
  "type": "url",
  "url": "https://example.com/api/words.json",
  "category": "custom",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

**Supported Response Formats:**

Array format:
```json
[
  { "word": "TEST", "definition": "A test word" }
]
```

Object format:
```json
{
  "words": [
    { "word": "TEST", "definition": "A test word" }
  ]
}
```

Or with `data` property:
```json
{
  "data": [
    { "word": "TEST", "definition": "A test word" }
  ]
}
```

#### 3. Local Provider

Use in-memory word lists.

```json
{
  "type": "local",
  "category": "custom",
  "data": [
    {
      "word": "CUSTOM",
      "definition": "A custom word"
    }
  ]
}
```

### Word Item Schema

Each word item must have:

- **`word`** (required): The word to guess
- **`definition`** (recommended): Explanation shown after game
- **`clue`** (optional): Hint for the word
- **`expansion`** (optional): Full form of acronym

```typescript
interface WordItem {
  word: string;
  clue?: string;
  expansion?: string;
  definition?: string;
}
```

## Theme Plugins

### Creating a Custom Theme

Themes are defined as JSON manifests with color schemes, typography, and sizing.

```json
{
  "id": "my-custom-theme",
  "name": "My Custom Theme",
  "description": "A beautiful custom theme",
  "version": "1.0.0",
  "author": "Your Name",
  "colors": {
    "bg": "#1a1a2e",
    "fg": "#eee",
    "muted": "#888",
    "accent": "#e94560",
    "accentFg": "#fff",
    "success": "#00ff00",
    "danger": "#ff0000",
    "surface": "#16213e",
    "surfaceBorder": "#0f3460",
    "tBase": "#16213e",
    "tBorder": "#0f3460",
    "tCorrect": "#00ff00",
    "tPresent": "#ffcc00",
    "tAbsent": "#1a1a2e",
    "keyBorder": "#0f3460"
  },
  "lightColors": {
    "bg": "#ffffff",
    "fg": "#1a1a2e",
    "accent": "#e94560",
    "tCorrect": "#00cc00",
    "tPresent": "#ff9900",
    "tAbsent": "#dddddd"
  },
  "typography": {
    "primaryFont": "Inter, sans-serif",
    "monoFont": "Fira Code, monospace"
  },
  "sizing": {
    "tile": "clamp(3rem, 7vw, 4rem)",
    "gap": "clamp(0.35rem, 2vw, 0.55rem)"
  },
  "icon": "https://example.com/icon.png"
}
```

### Theme Color Reference

#### Required Colors

- **`bg`**: Background color
- **`fg`**: Foreground/text color
- **`accent`**: Accent color (brand color)
- **`muted`**: Muted text color
- **`tCorrect`**: Correct letter background
- **`tPresent`**: Present letter background (wrong position)
- **`tAbsent`**: Absent letter background

#### Optional Colors

- **`bgGlow`**: Background glow effect
- **`accentFg`**: Text color on accent background
- **`success`**: Success message color
- **`danger`**: Error message color
- **`surface`**: Surface/card background
- **`surfaceBorder`**: Surface border color
- **`tBase`**: Tile base background
- **`tBorder`**: Tile border color
- **`keyBorder`**: Keyboard key border

## Configuration

### qwizzle.config.json

Create a `qwizzle.config.json` file to configure your plugins:

```json
{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "abc123",
      "category": "tech"
    },
    {
      "type": "url",
      "url": "https://api.example.com/words",
      "category": "business"
    }
  ],
  "themes": [
    {
      "id": "custom-dark",
      "name": "Custom Dark",
      "colors": {
        "bg": "#0d1117",
        "fg": "#c9d1d9",
        "accent": "#58a6ff",
        "muted": "#8b949e",
        "tCorrect": "#238636",
        "tPresent": "#f0883e",
        "tAbsent": "#21262d"
      }
    }
  ],
  "theme": "custom-dark",
  "categories": ["acronym", "vocab", "tech", "business"]
}
```

### Loading Configuration

#### Web (React)

```tsx
import { PluginAwareProvider } from "./providers/PluginAwareProvider";
import config from "./qwizzle.config.json";

function App() {
  return (
    <PluginAwareProvider config={config}>
      <YourApp />
    </PluginAwareProvider>
  );
}
```

#### Programmatic Usage

```typescript
import { loadConfig, globalRegistry } from "@qwizzle/plugins";

// Load from object
const results = await loadConfig(config);

// Load from URL
const results = await loadConfigFromUrl("https://example.com/config.json");

// Access providers
const provider = globalRegistry.getWordProvider("tech");
const theme = globalRegistry.getTheme("custom-dark");
```

## Examples

### Example 1: GitHub Gist Word List

1. Create a gist at https://gist.github.com with a JSON file:

```json
[
  {
    "word": "REACT",
    "definition": "A JavaScript library for building user interfaces",
    "clue": "Facebook's UI library"
  },
  {
    "word": "VITE",
    "definition": "Next generation frontend tooling",
    "clue": "Fast build tool"
  }
]
```

2. Get the gist ID from the URL (e.g., `abc123def456`)

3. Add to your config:

```json
{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "abc123def456",
      "filename": "words.json",
      "category": "frontend"
    }
  ]
}
```

### Example 2: Custom Theme

Create a cyberpunk theme:

```json
{
  "themes": [
    {
      "id": "cyberpunk",
      "name": "Cyberpunk 2077",
      "colors": {
        "bg": "#0a0e27",
        "fg": "#f2f2f2",
        "accent": "#ff006e",
        "muted": "#9d4edd",
        "tCorrect": "#00f5d4",
        "tPresent": "#ffbe0b",
        "tAbsent": "#2d3250",
        "surface": "#1a1f3a",
        "surfaceBorder": "#7209b7",
        "keyBorder": "#7209b7"
      },
      "typography": {
        "primaryFont": "Orbitron, sans-serif"
      },
      "icon": "https://example.com/cyberpunk-icon.png"
    }
  ],
  "theme": "cyberpunk"
}
```

### Example 3: Multi-Source Setup

Combine multiple word sources:

```json
{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "security-acronyms",
      "category": "security"
    },
    {
      "type": "url",
      "url": "https://api.mycompany.com/terms",
      "category": "company",
      "headers": {
        "Authorization": "Bearer token123"
      }
    },
    {
      "type": "local",
      "category": "custom",
      "data": [
        { "word": "CUSTOM", "definition": "My custom word" }
      ]
    }
  ],
  "categories": ["acronym", "security", "company", "custom"]
}
```

## API Reference

### Providers

```typescript
import {
  createGistProvider,
  createUrlProvider,
  createLocalProvider,
  createMultiSourceProvider,
} from "@qwizzle/plugins";

// Gist provider
const gistProvider = createGistProvider({
  gistId: "abc123",
  category: "tech",
  filename: "words.json",
});

// URL provider
const urlProvider = createUrlProvider({
  url: "https://api.example.com/words",
  category: "business",
  headers: { "API-Key": "secret" },
});

// Local provider
const localProvider = createLocalProvider({
  words: [{ word: "TEST", definition: "A test" }],
  category: "test",
});

// Multi-source provider
const multiProvider = createMultiSourceProvider({
  providers: [gistProvider, urlProvider],
  category: "combined",
  strategy: "random", // or "round-robin" or "weighted"
});
```

### Theme Loader

```typescript
import { createThemeLoader } from "@qwizzle/plugins";

const themeLoader = createThemeLoader();

// Load theme
themeLoader.loadTheme(myTheme);

// Load from URL
await themeLoader.loadThemeFromUrl("https://example.com/theme.json");

// Toggle dark/light mode
themeLoader.setPrefersDark(true);
```

## Best Practices

1. **Word Lists**
   - Keep words focused on a specific category
   - Always provide meaningful definitions
   - Test with actual gameplay before publishing

2. **Themes**
   - Ensure sufficient contrast between bg/fg colors
   - Test both light and dark variants
   - Provide clear distinction between correct/present/absent states

3. **Performance**
   - Use caching for remote word lists
   - Keep word lists under 1000 items for best performance
   - Minimize external dependencies

4. **Security**
   - Don't hardcode API keys in public configs
   - Use environment variables for sensitive data
   - Validate all external data

## Troubleshooting

### Word List Not Loading

- Check that your JSON is valid
- Ensure all words have required fields
- Verify CORS settings for URL providers
- Check browser console for errors

### Theme Not Applying

- Verify theme ID matches in config
- Check that all required colors are defined
- Ensure theme is registered before use
- Clear browser cache

### Provider Validation Errors

- Each word must have at least a `word` field
- Recommended to have `definition` or `clue`
- Words are automatically uppercased
- Category must match exactly

## Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
