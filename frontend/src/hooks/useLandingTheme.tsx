import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LandingThemePreference = "system" | "light" | "dark";
export type LandingResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pollean-landing-theme";

type LandingThemeContextValue = {
  preference: LandingThemePreference;
  resolved: LandingResolvedTheme;
  setPreference: (preference: LandingThemePreference) => void;
  toggle: () => void;
};

const LandingThemeContext = createContext<LandingThemeContextValue | null>(
  null,
);

function readStoredPreference(): LandingThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

function getSystemTheme(): LandingResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(
  preference: LandingThemePreference,
): LandingResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function LandingThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LandingThemePreference>(
    () => readStoredPreference(),
  );
  const [resolved, setResolved] = useState<LandingResolvedTheme>(() =>
    resolveTheme(readStoredPreference()),
  );

  const setPreference = useCallback((next: LandingThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setResolved(resolveTheme(next));
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(getSystemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return (
    <LandingThemeContext.Provider value={value}>
      {children}
    </LandingThemeContext.Provider>
  );
}

export function useLandingTheme() {
  const ctx = useContext(LandingThemeContext);
  if (!ctx) {
    throw new Error("useLandingTheme must be used within LandingThemeProvider");
  }
  return ctx;
}
