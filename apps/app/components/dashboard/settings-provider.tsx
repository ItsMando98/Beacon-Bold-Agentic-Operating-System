"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";

type DashboardSettings = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  theme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<"light" | "dark">>;
};
const SettingsContext = createContext<DashboardSettings | null>(null);

export function DashboardSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return (
    <SettingsContext.Provider
      value={{ collapsed, setCollapsed, theme, setTheme }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useDashboardSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("DashboardSettingsProvider required");
  return settings;
}
