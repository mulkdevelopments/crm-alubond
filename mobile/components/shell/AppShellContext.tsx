import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AppShellContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const value = useMemo(
    () => ({
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      toggleMenu: () => setMenuOpen((prev) => !prev),
    }),
    [menuOpen]
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useOptionalAppShell() {
  return useContext(AppShellContext);
}

export function useAppShell() {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used inside AppShellProvider");
  }
  return value;
}
