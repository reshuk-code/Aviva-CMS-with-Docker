"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Light/dark theming for the admin.
 *
 * This replaced `next-themes`, which did the same two things but rendered its
 * anti-flash `<script>` from inside a Client Component. React 19 warns about
 * that on every client render ("Encountered a script tag while rendering React
 * component"), and the library exposes no way to skip it — `nonce` and
 * `scriptProps` only set attributes on the script it insists on rendering.
 *
 * Here the script is emitted by the admin layout, which is a Server Component,
 * so it lands in the HTML and runs before first paint exactly as before. The
 * client half is state only, so there is no script for React to object to.
 *
 * Scoped to the admin: the CMS never imposes a theme system on the developer's
 * public site.
 */
export const THEME_STORAGE_KEY = "cms-theme";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Applies the class the stylesheet keys off, before the first paint.
 *
 * Stringified into the document by `ThemeScript` below, so it must stay
 * self-contained — no imports, no closure over anything.
 */
function applyTheme(storageKey: string) {
  try {
    const stored = localStorage.getItem(storageKey);
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || ((!stored || stored === "system") && system);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    // Private mode can refuse localStorage. Falling back to light is correct:
    // never let a theme preference break the page it is meant to style.
  }
}

/**
 * The inline script, rendered from a Server Component.
 *
 * It must run before the browser paints, which is why it is inline and not a
 * module: a deferred script would let the admin flash white and then go dark.
 */
export function ThemeScript() {
  return (
    <script
      // The server writes it; the client never re-renders it into existence.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `(${applyTheme.toString()})(${JSON.stringify(THEME_STORAGE_KEY)})`,
      }}
    />
  );
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  /*
   * Read in a lazy initialiser, not an effect.
   *
   * The obvious version — start at "system", then adopt localStorage in a
   * useEffect — is setState-inside-an-effect, which this codebase forbids and
   * the lint rule rejects. It is also unnecessary here: the inline script has
   * already put the right class on <html> before React runs, so this state
   * never decides what is on screen during the first pass. It only has to be
   * right by the time somebody clicks the toggle.
   *
   * The initialiser runs on the server too, where there is no localStorage, so
   * it falls back to the same default the script assumes.
   */
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "system";
    } catch {
      return "system";
    }
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    theme === "system" ? systemTheme() : theme,
  );

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (theme !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = query.matches ? "dark" : "light";
      setResolved(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    const applied = next === "system" ? systemTheme() : next;

    setThemeState(next);
    setResolved(applied);
    document.documentElement.classList.toggle("dark", applied === "dark");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Refused storage means the choice lasts this session only, which beats
      // throwing out of a click handler.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Same shape next-themes exposed, so call sites did not have to change. */
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);

  if (!value) {
    // Outside the provider — the public site — report light rather than throw.
    return { theme: "system", resolvedTheme: "light", setTheme: () => {} };
  }

  return value;
}
