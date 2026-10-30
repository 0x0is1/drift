import { createContext, useContext, useState, type ReactNode } from "react";

type DrawerUiContextValue = {
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const DrawerUiContext = createContext<DrawerUiContextValue | null>(null);

export function DrawerUiProvider({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  return (
    <DrawerUiContext.Provider value={{ isDrawerOpen, setDrawerOpen }}>
      {children}
    </DrawerUiContext.Provider>
  );
}

export function useDrawerUi() {
  const ctx = useContext(DrawerUiContext);
  if (!ctx) throw new Error("useDrawerUi must be used within DrawerUiProvider");
  return ctx;
}
