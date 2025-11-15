# Qwizzle Examples

This directory contains example configurations, themes, and word lists to help you get started with Qwizzle plugins.

## Contents

### Configurations

- **`configs/basic.qwizzle.config.json`** - Simple configuration with a single gist provider
- **`configs/advanced.qwizzle.config.json`** - Advanced setup with multiple providers and custom themes

### Themes

- **`themes/neon-nights.theme.json`** - A vibrant neon-inspired theme with electric colors

### Word Lists

- **`wordlists/frontend-terms.json`** - Frontend development terms and frameworks

## How to Use

### Using a Configuration File

1. Copy one of the example configs to your project root
2. Rename it to `qwizzle.config.json`
3. Update the values (gist IDs, URLs, etc.)
4. Load it in your app:

```tsx
import config from "./qwizzle.config.json";
import { PluginAwareProvider } from "./providers/PluginAwareProvider";

function App() {
  return (
    <PluginAwareProvider config={config}>
      <YourApp />
    </PluginAwareProvider>
  );
}
```

### Using a Theme

1. Copy the theme JSON file
2. Add it to your config under `themes`:

```json
{
  "themes": [
    // Paste theme JSON here
  ],
  "theme": "neon-nights"
}
```

### Using a Word List

#### As a GitHub Gist

1. Create a new gist at https://gist.github.com
2. Upload the word list JSON file
3. Copy the gist ID from the URL
4. Add to your config:

```json
{
  "wordLists": [
    {
      "type": "gist",
      "gistId": "your-gist-id",
      "filename": "frontend-terms.json",
      "category": "frontend"
    }
  ]
}
```

#### As a URL

1. Host the JSON file on any web server
2. Add to your config:

```json
{
  "wordLists": [
    {
      "type": "url",
      "url": "https://example.com/frontend-terms.json",
      "category": "frontend"
    }
  ]
}
```

#### As Local Data

Copy the word list array directly into your config:

```json
{
  "wordLists": [
    {
      "type": "local",
      "category": "frontend",
      "data": [
        { "word": "REACT", "definition": "..." }
      ]
    }
  ]
}
```

## Creating Your Own

### Custom Word List

1. Create a JSON file with an array of word items:

```json
[
  {
    "word": "YOUR_WORD",
    "expansion": "Optional expansion",
    "definition": "The definition shown after the game",
    "clue": "Optional hint"
  }
]
```

2. Upload to a gist or host it somewhere
3. Add to your config

### Custom Theme

1. Start with the neon-nights example
2. Modify the colors to match your brand
3. Test in both light and dark modes
4. Add to your config

## Tips

- Keep word lists focused on specific categories
- Ensure sufficient color contrast in themes
- Test configurations before deploying
- Use environment variables for API tokens

## Need Help?

See the [Plugin Development Guide](../PLUGIN_DEVELOPMENT_GUIDE.md) for detailed documentation.
