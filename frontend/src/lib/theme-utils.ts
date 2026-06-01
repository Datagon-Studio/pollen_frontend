/**
 * Design System Theme Utilities
 * 
 * Functions to handle Hex-to-HSL conversion and dynamic CSS injection
 * for group branding pages.
 */

export const THEME_DEFAULTS = {
  primary: "#FFBD59",
  secondaryLight: "#ECE7DF",
  backgroundLight: "#F6F1EA",
  secondaryDark: "#3D3D3D",
  backgroundDark: "#2E2E2E",
};

export interface ThemeColors {
  primary: string;
  secondaryLight: string;
  backgroundLight: string;
  secondaryDark: string;
  backgroundDark: string;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Normalize hex
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  
  // Verify hex format
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error("Invalid hex color code");
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hexToTailwindHsl(hex: string): string {
  try {
    const { h, s, l } = hexToHsl(hex);
    return `${h} ${s}% ${l}%`;
  } catch (e) {
    console.error("Invalid hex color:", hex, e);
    return "36 100% 67%"; // default primary fallback
  }
}

/**
 * Resolves theme colors based on public page configuration
 */
export function getThemeColors(publicPage: any): ThemeColors {
  if (!publicPage) {
    return { ...THEME_DEFAULTS };
  }

  // Fallback support for legacy primary_color / secondary_color columns
  const legacyPrimary = publicPage.primary_color || undefined;
  const legacySecondary = publicPage.secondary_color || undefined;

  if (!publicPage.use_custom_theme) {
    // If not using custom theme, but legacy colors were customized, we can fall back to them
    // to preserve backward compatibility, or just use the site defaults.
    return {
      primary: legacyPrimary || THEME_DEFAULTS.primary,
      secondaryLight: legacySecondary || THEME_DEFAULTS.secondaryLight,
      backgroundLight: THEME_DEFAULTS.backgroundLight,
      secondaryDark: THEME_DEFAULTS.secondaryDark,
      backgroundDark: THEME_DEFAULTS.backgroundDark,
    };
  }

  return {
    primary: publicPage.custom_primary_color || legacyPrimary || THEME_DEFAULTS.primary,
    secondaryLight: publicPage.custom_secondary_light_color || legacySecondary || THEME_DEFAULTS.secondaryLight,
    backgroundLight: publicPage.custom_background_light_color || THEME_DEFAULTS.backgroundLight,
    secondaryDark: publicPage.custom_secondary_dark_color || THEME_DEFAULTS.secondaryDark,
    backgroundDark: publicPage.custom_background_dark_color || THEME_DEFAULTS.backgroundDark,
  };
}

/**
 * Returns dynamic CSS overrides to be injected in a style tag
 */
export function getThemeStyles(colors: ThemeColors): string {
  const primaryHsl = hexToTailwindHsl(colors.primary);
  const secondaryLightHsl = hexToTailwindHsl(colors.secondaryLight);
  const backgroundLightHsl = hexToTailwindHsl(colors.backgroundLight);
  const secondaryDarkHsl = hexToTailwindHsl(colors.secondaryDark);
  const backgroundDarkHsl = hexToTailwindHsl(colors.backgroundDark);

  return `
    :root {
      --primary: ${primaryHsl};
      --secondary: ${secondaryLightHsl};
      --background: ${backgroundLightHsl};
      --card: ${backgroundLightHsl};
      --popover: ${backgroundLightHsl};
    }
    .dark {
      --secondary: ${secondaryDarkHsl};
      --background: ${backgroundDarkHsl};
      --card: ${secondaryDarkHsl};
      --popover: ${secondaryDarkHsl};
    }
  `;
}
