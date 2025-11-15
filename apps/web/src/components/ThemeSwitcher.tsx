/**
 * Theme Switcher Component
 * Allows users to preview and switch between available themes
 */

import { useState } from "react";
import { useTheme } from "../theme/theme";
import { globalRegistry, defaultThemes, type ThemeManifest } from "@qwizzle/plugins";
import "./ThemeSwitcher.css";

export function ThemeSwitcher() {
  const { theme: currentThemeMode, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  // Get all available themes from the registry
  const availableThemes = globalRegistry.getAllThemes();

  // Combine default themes with any loaded custom themes
  const allThemes = [...defaultThemes, ...availableThemes];

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    // Here you would apply the theme using the ThemeLoader
    // For now, we'll just show the selection
    console.log("Selected theme:", themeId);
  };

  const renderThemePreview = (theme: ThemeManifest) => {
    const colors = currentThemeMode === "dark" ? theme.colors : theme.lightColors || theme.colors;

    return (
      <div key={theme.id} className="theme-preview" onClick={() => handleThemeSelect(theme.id)}>
        <div className="theme-preview__colors">
          <div
            className="theme-preview__color"
            style={{ backgroundColor: colors.bg }}
            title={`Background: ${colors.bg}`}
          />
          <div
            className="theme-preview__color"
            style={{ backgroundColor: colors.accent }}
            title={`Accent: ${colors.accent}`}
          />
          <div
            className="theme-preview__color"
            style={{ backgroundColor: colors.tCorrect }}
            title={`Correct: ${colors.tCorrect}`}
          />
          <div
            className="theme-preview__color"
            style={{ backgroundColor: colors.tPresent }}
            title={`Present: ${colors.tPresent}`}
          />
          <div
            className="theme-preview__color"
            style={{ backgroundColor: colors.tAbsent }}
            title={`Absent: ${colors.tAbsent}`}
          />
        </div>
        <div className="theme-preview__info">
          <h4 className="theme-preview__name">{theme.name}</h4>
          {theme.description && <p className="theme-preview__description">{theme.description}</p>}
        </div>
        {selectedTheme === theme.id && <div className="theme-preview__selected">✓</div>}
      </div>
    );
  };

  return (
    <div className="theme-switcher">
      <button className="theme-switcher__toggle" onClick={() => setIsOpen(!isOpen)} title="Change theme">
        🎨
      </button>

      {isOpen && (
        <div className="theme-switcher__panel">
          <div className="theme-switcher__header">
            <h3>Themes</h3>
            <button className="theme-switcher__close" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="theme-switcher__mode">
            <label>
              <input type="checkbox" checked={currentThemeMode === "light"} onChange={toggleTheme} />
              <span>Light mode</span>
            </label>
          </div>

          <div className="theme-switcher__themes">{allThemes.map(renderThemePreview)}</div>

          <div className="theme-switcher__footer">
            <p className="theme-switcher__hint">
              💡 Create custom themes with <code>qwizzle.config.json</code>
            </p>
          </div>
        </div>
      )}

      {isOpen && <div className="theme-switcher__backdrop" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
