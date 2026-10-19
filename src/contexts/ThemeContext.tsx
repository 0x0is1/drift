import { createContext, useContext, useState, useMemo, type ReactNode } from "react";

type Scheme = "dark" | "light";

type ThemeContextValue = {
  scheme: Scheme;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>("dark");
  const value = useMemo(
    () => ({
      scheme,
      toggleScheme: () => setScheme((s) => (s === "dark" ? "light" : "dark")),
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
