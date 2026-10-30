import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Scheme = "dark" | "light";

type ThemeContextValue = {
  scheme: Scheme;
  // False until the persisted scheme has been read (or confirmed absent).
  // _layout.tsx holds the native splash screen up until this flips true, so
  // it never hides into a default-dark first paint that then flips to the
  // user's actual saved light theme a tick later.
  ready: boolean;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "drift:theme-scheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "dark" || stored === "light") setScheme(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      scheme,
      ready,
      toggleScheme: () =>
        setScheme((s) => {
          const next = s === "dark" ? "light" : "dark";
          AsyncStorage.setItem(STORAGE_KEY, next);
          return next;
        }),
    }),
    [scheme, ready],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
