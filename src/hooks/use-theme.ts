"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      const html = document.documentElement;
      html.classList.remove("light", "dark");
      html.classList.add(saved);
    } else {
      const html = document.documentElement;
      html.classList.remove("light", "dark");
      html.classList.add("dark");
      setTheme("dark");
    }
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(next);
  };

  return { theme, toggle, isDark: theme === "dark" };
}
